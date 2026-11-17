# Nitro v3 Backend

バックエンドはNitro v3の単体サーバーです。`nitro@3.0.261102-rc` を固定して使用しています。
APIを先に整備する方針です。既存のFrontendは削除し、APIが概ね揃った後に再構築します。

参考資料：

- [claim-fusen 草稿](https://outline-wiki.pitamai.com/doc/claim-fusen-bsY8XvKb2Q)
- [Hono API基盤と最小API](https://outline-wiki.pitamai.com/doc/3-hono-apiapi-8eviPjguLT)
- [Nitro v3 Routing](https://nitro.build/docs/routing)

## RouteとService

```text
Nitro Route: 入力検証、Service呼び出し、HTTP status / JSON応答
  ↓
Service: DB操作、参照先の存在確認、Project整合性、Relation重複判定
  ↓
Drizzle / PostgreSQL
```

ServiceにはHTTPのeventを渡しません。入力検証には `@kari-fusen/schemas` の共有Zodスキーマを使います。
Nitro v3では自動importを使わず、`nitro` / `nitro/h3` と自分のモジュールを明示的にimportします。

| ファイル | 役割 |
| --- | --- |
| `nitro.config.ts` | `src`のルート探索、Nodeサーバー向けビルド、エラー処理の設定 |
| `src/routes/health.get.ts` | `GET /health` |
| `src/api/**/*.get.ts`, `*.post.ts`, `*.patch.ts`, `*.delete.ts` | `/api/*`のHTTP Handler |
| `src/api/claims/[claimId]/evidences.post.ts` | URLのclaimIdとJSONを検証してRelationを作成 |
| `src/utils/validation.ts` | JSON解析と共有スキーマによる入力検証 |
| `src/error.ts` | 既知のエラー応答と、内部情報を含まない500応答 |
| `src/services/*.ts` | HTTP frameworkから独立したDB処理 |
| `src/pool.ts`, `src/db/index.ts` | PostgreSQL PoolとDrizzle Client |
| `src/plugins/database.ts` | 終了・再読み込み時のPool解放 |

## パスエイリアス

Nitroの `alias` とTypeScriptの `paths` を次のように揃えています。
Vitestも `tsconfig.json` のパス設定を読み込みます。

| エイリアス | 参照先 |
| --- | --- |
| `~/` | `apps/server/src/` |
| `~~/` | `apps/server/` |

```ts
import { insertClaim } from '~/services/claims'
```

`~~/` はバックエンドのルートであり、リポジトリ全体のルートではありません。

## 実装済みAPI

| Method / Path | 成功時 |
| --- | --- |
| `GET /` | 200、`Hello Nitro!` |
| `GET /health` | 200、`{"status":"ok"}`。DBの疎通確認はしない |
| `GET /api/projects` | 200、Project配列 |
| `POST /api/projects` | 201、作成したProject |
| `POST /api/sources` | 201、作成したSource |
| `GET /api/sources` | 200、全Projectで共有するSource配列 |
| `POST /api/claims` | 201、作成したClaim |
| `GET /api/claims?projectId=<UUID>` | 200、指定ProjectのClaim配列 |
| `GET /api/claims/:claimId` | 200、Claimの詳細と関連するEvidence / Source |
| `POST /api/evidences` | 201、作成したEvidence |
| `GET /api/evidences?projectId=<UUID>` | 200、指定ProjectのEvidence配列。各要素にSourceを含む |
| `POST /api/claims/:claimId/evidences` | 201、作成したClaimEvidence |
| `PATCH /api/claims/:claimId` | 200、更新したClaim |
| `PATCH /api/projects/:projectId` | 200、更新したProject |
| `PATCH /api/sources/:sourceId` | 200、更新したSource |
| `PATCH /api/evidences/:evidenceId` | 200、更新したEvidence |
| `PATCH /api/claims/:claimId/evidences/:relationId` | 200、更新したClaimEvidence |
| `DELETE /api/claims/:claimId/evidences/:relationId` | 204、本文なし |
| `GET /api/projects/:projectId` | 200、Project単体 |
| `GET /api/sources/:sourceId` | 200、Source単体 |
| `GET /api/evidences/:evidenceId` | 200、Evidence単体。`source` を含む |

JSONを送るときは `Content-Type: application/json` を指定します。
タイトルのtrim、Claimの初期status、quoteとsummaryの分離は既存スキーマの振る舞いを引き継ぎます。

入力不正・不正JSONは400、参照先不在は404、異なるProject同士のRelationは400、Relation重複は409です。
これらのエラーは従来の固定テキストを返します。予期しない内部エラーは500で
`{"error":"Internal Server Error"}` を返し、開発時もSQL・接続情報・stackをレスポンスへ出しません。

## Source一覧・作成

Source作成はtitle必須、type・year・urlは任意です。urlはHTTP／HTTPSの絶対URLのみ受け付けます。
Source一覧はupdatedAt降順、同日時ならid昇順です。SourceはProjectをまたいで共有します。

## Evidence一覧・作成

`GET /api/evidences?projectId=<UUID>` は、そのProjectに属するEvidenceだけをDBで絞り込み、各要素に `source` を含めて返します。
queryの省略・空文字・不正UUID・複数指定は400、Project不在は404、既存Projectの空一覧は200 `[]` です。
並び順はupdatedAt降順、同日時ならid昇順です。

`POST /api/evidences` は、空白以外の引用または要約が必要です。両方未入力・null・空白だけの場合は400になります。
これは従来の「内容なしでも作成可能」からの入力条件の変更です。既存の空のEvidenceは変更しません。
保存する引用・要約の空白・改行は保持します。Project／Source不在は従来どおり、それぞれ404の固定メッセージです。
Brunoの不在確認リクエストにも有効な引用を設定し、入力検証後の404を確認できるようにしています。

## Projectに属するClaimの一覧

`GET /api/claims?projectId=<UUID>` は指定ProjectのClaimだけを返します。
`projectId` は必須です。省略・空文字・不正UUID・複数指定は400 `Invalid input`、
Projectが存在しない場合は404 `Project not found` になります。
存在するProjectにClaimがなければ200で `[]` を返します。
並び順はupdatedAtの降順で、同じ日時の場合はidの昇順です。

```powershell
$projectId = '取得対象のProjectのUUID'
Invoke-RestMethod -Uri "http://localhost:3000/api/claims?projectId=$projectId"
```

Serviceの `listClaimsByProject()` がDBで絞り込み、Routeでqueryの検証とHTTP応答を扱います。
Brunoの `claims-list.yml` では、返された各ClaimのprojectIdが指定したIDと一致することを確認します。

## Claim詳細の取得

`GET /api/claims/:claimId` は次の構造を返します。

```text
Claim（id、projectId、title、body、status、createdAt、updatedAt）
└─ claimEvidences[]
   ├─ id、claimId、evidenceId、type、note、createdAt
   └─ evidence
      ├─ id、projectId、sourceId、quote、summary、locator、note、createdAt、updatedAt
      └─ source（id、title、type、year、url、metadata、createdAt、updatedAt）
```

関連がなくてもClaim自体は返り、`claimEvidences` は空配列になります。
不正なclaimIdは400 `Invalid input`、存在しないClaimは404 `Claim not found` です。
一覧取得や検索ではなく、指定した1件だけを取得します。

Project → Source → Claim → Evidence → ClaimEvidenceを作成した後、作成結果のclaimIdを使って確認します。

```powershell
$claimId = '作成したClaimのUUID'
Invoke-RestMethod -Uri "http://localhost:3000/api/claims/$claimId" | ConvertTo-Json -Depth 10
```

`claimEvidences[].type` / `note`、`evidence.quote` / `summary` / `locator`、
`evidence.source.title` を辿れることを確認します。Brunoの `claim-detail.yml` からも確認できます。

## 登録済みデータの更新

PATCHは指定された項目だけを更新します。省略項目は維持し、任意項目は `null` で消去できます。
空オブジェクト、未知の項目、変更不可の項目、不正値は400 `Invalid input` です。
IDが不正なら400、不在なら404で `Claim not found` / `Project not found` / `Source not found` / `Evidence not found` を返します。
成功時は更新後のレコードを200で返し、4種類のデータの `updatedAt` をサーバー日時に更新します。`createdAt` は維持します。

| 対象 | 更新できる項目 | nullで消去できる項目 |
| --- | --- | --- |
| Claim | title、body、status | body |
| Project | title、description | description |
| Source | title、type、year、url | type、year、url |
| Evidence | sourceId、quote、summary、locator、note | quote、summary、locator、note |

タイトルはtrimし、空白だけの値を拒否します。本文・説明・引用・要約・メモの空白と改行は保持します。
Claimのstatusは `draft` / `active` / `archived` のみ。省略時に `active` へ戻しません。
SourceのURLは作成時と同じHTTP／HTTPSの絶対URLに限定し、yearは32bit整数またはnullです。Sourceの変更はすべての参照先へ反映されます。
`id`・`projectId`・日時・Sourceのmetadataは変更できません。

Evidenceは保存済みの引用・要約と更新内容を合わせて検証し、更新後にどちらか一方の内容を必須とします。
引用だけを消しても要約が残れば更新可能ですが、両方が空なら400です。既存の内容が空のEvidenceも、引用か要約を補うまでメモだけの更新はできません。
行ロックを伴うトランザクションで検証と保存を行い、引用と要約の同時消去を防ぎます。
sourceIdの変更先が不在なら404 `Source not found` となり、変更全体を保存しません。Projectの付け替えはできません。

```powershell
$claimId = '更新するClaimのUUID'
$body = @{ body = $null } | ConvertTo-Json
Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/claims/$claimId" -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

## 関係の編集・解除

`relationId` はEvidenceのIDではなく、関係作成レスポンスまたはClaim詳細の `claimEvidences[].id` を指定します。
PATCHで変更できるのは `type` と `note` だけです。typeは `supports` / `challenges` / `contextualizes` / `corresponds`、noteはnullで消去できます。
type省略時は維持します。同じClaim・Evidence・typeが既に存在する変更は409 `Relation already exists` となり、noteを含めて変更を保存しません。
同じ関係に現在と同じtypeを送る更新は成功します。重複判定には既存のDB一意制約を使用します。

PATCHとDELETEはURLのClaimと関係IDの両方で対象を絞り込みます。
Claim不在は404 `Claim not found`、別Claimの関係または関係不在は404 `Relation not found` です。
DELETE成功は204で本文を返しません。再DELETEは404です。Claim・Evidence・Sourceは削除しません。
関係の `createdAt` は維持し、`updatedAt` 列は追加しません。DB migrationは不要です。

## Project・Source・Evidenceの個別取得

ProjectとSourceは指定IDの1件だけを返し、子の一覧は含みません。
Evidenceは指定IDの1件と `source` を返します。JSONの日時はISO形式の文字列です。
不正IDは400 `Invalid input`、不在は各対象の404固定メッセージです。
Claim詳細の従来のネスト構造は維持しています。

## 開発と確認

Node.jsは `^20.19.0 || >=22.12.0` が必要です。リポジトリのルートで実行します。
ルートの `.env.example` を参考に `.env` へ `DATABASE_URL` を設定し、PostgreSQLと既存migrationを準備します。

```powershell
pnpm install --frozen-lockfile
pnpm run dev:server
```

開発サーバーはルートの `.env` を読み込み、3000番ポートで起動します。
別のPowerShellで確認します。

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/health'
Invoke-RestMethod -Uri 'http://localhost:3000/api/projects'

$body = @{ title = '研究テーマ'; description = $null } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/projects' -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

POSTは接続先DBへ保存します。開発用DBで実行してください。
返されたidがProject一覧にも含まれることを確認します。その他の入力例は `bruno/` にあります。

```powershell
pnpm typecheck
pnpm run test:server
pnpm run build:server
pnpm run start:server
```

通常のテストはServiceを差し替えてHTTPの検証・応答・エラーを確認し、DB操作を差し替えてEvidenceの結合後の検証と関係の一意制約エラーの判定を確認します。
実DBでの確認は次の専用テストに分けています。
`build:server` は `.output/` へ本番用サーバーを生成します。`start:server` はルートの `.env` を読み込んで起動します。

デプロイ先では `DATABASE_URL` を環境変数で設定し、`node .output/server/index.mjs` を実行します。
`.env` はビルド成果物へ含めません。ポートは `PORT` または `NITRO_PORT` で指定できます。

### PostgreSQL統合テスト

`test/updates.integration.test.ts` は `TEST_DATABASE_URL` が未設定ならスキップします。通常の `DATABASE_URL` へフォールバックしません。
テスト専用DBを別に作成し、既存migrationを適用してから実行してください。テストは自分で生成したUUIDのデータだけを後片付けし、テーブル全体の削除・再作成やmigrationの自動適用はしません。

```powershell
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/claim_fusen_test'
# 専用DBへの初回migrationのみ、一時的に接続先を指定する
$previousDatabaseUrl = $env:DATABASE_URL
try {
  $env:DATABASE_URL = $env:TEST_DATABASE_URL
  pnpm run db:migrate
} finally {
  $env:DATABASE_URL = $previousDatabaseUrl
}
pnpm run test:server
```

接続先の変更はPowerShellの環境変数で行います。Vitestは `.env` の `TEST_DATABASE_URL` を自動では読み込みません。
実DBでは、部分更新時の既存値・createdAt維持とupdatedAt更新、Source変更、関係の重複時ロールバック、別Claimの関係の保護、繰り返し解除、個別詳細、引用と要約の並行消去を検証します。

### Brunoでの確認

`bruno/` の更新・詳細・解除リクエストのUUIDはサンプルです。作成済みのProject／Source／Claim／Evidence／関係のIDへ置き換えてください。
関係の409確認には、同じClaimとEvidenceに `supports` と `challenges` の2関係を用意し、supports側をchallengesへ更新します。
解除の204確認の後、同じIDの解除リクエストで404を確認します。Brunoは接続先DBを更新するので開発用DBで実行します。
更新後のGET詳細で、省略した項目が維持されたこと、null消去、updatedAtの更新を確認してください。
