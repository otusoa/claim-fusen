# Ent DBスキーマ

[2. EntスキーマInit](https://outline-wiki.pitamai.com/doc/2-entinit-mhjKRATQUp)に基づくGo実装。
`ent/schema/` をデータモデル定義の基準とする。
対象はProject、Claim、Source、Evidence、ClaimEvidenceの5 Entity。
HTTP API、認証、Question、Claim同士のRelation、画面は今回の対象外。

## 生成・検査

Goのバージョンは `go.mod` の指定に合わせる。`apps/server` で実行する。

```sh
go mod download
go generate ./ent
go test ./...
go vet ./...
```

生成コードはコミット対象とし、直接編集しない。
変更は `ent/schema/` に加え、上記の `go generate` で再生成する。
Go 1.27でコード生成を動かすため、Entが利用する `golang.org/x/tools` も更新している。

ルートのpnpmコマンドからも `pnpm db:generate`、`pnpm test`、`pnpm check` を実行できる。
Backendの実行・生成にNodeのORMやTypeScriptは使用しない。

## Backend起動

### ComposeでDBとBackendを起動

リポジトリのルートで実行する。既に `.env` がある場合は上書きせず、
`.env.example` に追加された項目を既存の設定へ追記する。

```sh
cp .env.example .env
docker compose config --quiet
docker compose up --build -d
docker compose ps -a
docker compose logs db migrate backend
curl http://127.0.0.1:8080/health
```

DBのhealthcheck成功後、専用の `migrate` サービスがSchemaを反映し、
終了コード0を確認して `backend` が起動する。migrationが失敗するとBackendは起動しない。
空の開発用DBとCompose専用のnamed volumeを使用し、既存DBの取り込みは行わない。
公開先はローカルの `127.0.0.1` に限定する。

`POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` と両接続URLの認証情報を揃える。
`DATABASE_URL` はホスト用の `localhost`、`COMPOSE_DATABASE_URL` はコンテナ用の `db:5432`。
パスワード等に `@` / `:` / `/` / `%` などの特殊文字がある場合、URL内ではパーセントエンコードし、
`POSTGRES_PASSWORD` には元の文字列を設定する。`.env` 内の `$` を含む値は単引用符で囲む。
`POSTGRES_PORT` を変えた場合はホスト用 `DATABASE_URL` のポートも変更する。
`BACKEND_PORT` を変えた場合はcurlのポートを合わせる。
PostgreSQLの初期ユーザー・DB・パスワード設定は空のvolumeへの初回起動時に適用される。
データ保持後の `.env` 変更だけではDB内の認証情報は変更されない。

コード変更後は `docker compose up --build -d` で再buildする。
手動でmigrationを再実行する場合は、DB起動後に次を実行する。

```sh
docker compose up -d db
docker compose run --rm migrate
```

通常の停止・再起動ではデータを残す。

```sh
docker compose down
docker compose up --build -d
```

開発DBを完全に初期化する場合だけ `docker compose down --volumes` を実行する。
この操作はComposeのDBデータを削除する。
ホットリロードやFrontendのコンテナは今回導入していない。

### ホスト上でGoを起動

`apps/server` で `DATABASE_URL` を設定し、migrationを別途適用してから `go run .` で起動する。
`.env` は自動では読み込まない。`PORT` は省略時に `8080` を使う。

起動時に `internal/database.Open` で接続とPingを確認し、共有Ent ClientをProject Serviceへ渡す。
Serviceの `List(context.Context)` でProject Queryを実行し、成功してからGinを起動する。
DB未接続・未migrationの場合は原因をログに出して終了し、起動時の自動migrationは行わない。
`GET /health` は従来どおり200と `{"message":"OK"}` を返す。

SIGINT/SIGTERMを受けるとHTTPリクエストの終了を待ち、その後Ent ClientをCloseする。
起動失敗時にも初期化済みClientをCloseする。
RouterにはProject Serviceを渡しているため、今後のProject Handlerでは
`c.Request.Context()` をServiceへ渡して同じClientを利用できる。今回はCRUD endpointを登録しない。

```sh
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/claim_fusen?sslmode=disable'
go run ./cmd/migrate
go run .
```

## 開発用migration

今回の方針は、新しい空の開発用PostgreSQL DBへEnt Schemaを反映すること。
旧Drizzle DBを引き継ぐmigrationや既存データの移行は行わない。
旧SQLは `docs/archive/drizzle/` に参考資料として保存してあり、Entと二重に適用しない。

ルートの `.env.example` に接続URLの例がある。
Goコマンドは `.env` を自動では読み込まないので、環境変数を設定して実行する。
`apps/server` で、接続先が新しい開発用DBであることを確認してから実行する。

```sh
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/claim_fusen?sslmode=disable'
go run ./cmd/migrate
```

ルートの `pnpm db:migrate` からも同じ処理を実行できる。
`client.Schema.Create(ctx)` を使う開発用の自動migrationであり、既存カラム・indexの削除オプションは有効にしていない。
本番相当のデータを保持する前にAtlasのversioned migrationを検討する。

## Relationと保存方法

ClaimEvidenceは `Through` を使うEdge Schemaであり、UUID、type、note、created_atを保持する。
同一Claim・Evidenceでも異なるtypeは保存でき、同一Claim・Evidence・typeの重複はunique indexで拒否する。
EntがThroughに自動追加する2カラムのunique indexは、この要件より厳しいため、
`ent/cmd/entgen/` の生成Hookで除外する。3カラムのunique indexがない場合は生成を失敗させる。
このHookを使うため、Ent CLIの直接実行ではなく `go generate ./ent` を使う。

Relationを作成するときは、typeを指定できる `client.ClaimEvidence.Create()` を使う。
`AddEvidences` / `AddClaims` はRelationの必須typeを設定できないため使わない。

```go
relation, err := client.ClaimEvidence.Create().
    SetClaim(claim).
    SetEvidence(evidence).
    SetType(schema.RelationSupports).
    Save(ctx)

source, err := claim.QueryClaimEvidences().QueryEvidence().QuerySource().Only(ctx)
```

`claim.QueryEvidences()`、`evidence.QueryClaims()` のThrough経由の取得も使える。
type・noteを取得したい場合はClaimEvidenceを経由する。

## データの扱い

- UUIDは既存Go moduleの `github.com/google/uuid` で統一し、Ent作成時に生成する。
- 時刻はGoの `time.Time`、PostgreSQLでは `timestamptz`。`created_at` は作成時、`updated_at` はEnt更新時に自動設定する。生SQLによる更新には自動更新は適用されない。
- Project削除はClaim/Evidenceへ、Claim/Evidence削除はClaimEvidenceへcascadeする。
- Evidenceが参照するSourceの削除はrestrictする。SourceはProjectに所属しない。
- 任意の文字列とyearはnullable。metadataは任意のJSONB。
- statusとRelationのtypeはtextのまま保持し、候補値はGoの定数として提供する。enumやCHECK制約には固定しない。
- ClaimとEvidenceのProject一致は今回のDB制約には含めない。API実装時に扱いを決める。

## PostgreSQLでの検証

保存・取得テストは `TEST_DATABASE_URL` がある場合だけ実行する。
テストはSchemaを反映するため、必ず使い捨ての検証用DBを指定する。
`DATABASE_URL` へのフォールバックはしない。

```sh
TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/claim_fusen_test?sslmode=disable' go test -p 1 ./... -count=1 -v
```

『御教誡』サンプルの保存とClaim → ClaimEvidence → Evidence → Sourceの取得、
Throughの双方向取得、更新日時、Relationの重複拒否と異なるtypeの保存、cascade/restrictを確認する。
さらにBackend起動後のhealth応答と、停止後にPostgreSQL接続が解放されることを確認する。
