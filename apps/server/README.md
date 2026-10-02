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
TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/claim_fusen_test?sslmode=disable' go test ./... -count=1 -v
```

『御教誡』サンプルの保存とClaim → ClaimEvidence → Evidence → Sourceの取得、
Throughの双方向取得、更新日時、Relationの重複拒否と異なるtypeの保存、cascade/restrictを確認する。
