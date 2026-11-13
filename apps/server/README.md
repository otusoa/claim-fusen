# Nitro v3 Backend

バックエンドはNitro v3の単体サーバーです。公開版 `nitro@3.0.260903-beta` を固定して使用しています。
Frontendは既存のVue / Vite SPAのままです。

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
| `src/api/*.get.ts`, `src/api/*.post.ts` | `/api/*`のHTTP Handler |
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

テストはServiceを差し替えてHTTPの検証、応答、エラーを確認します。実DBの疎通確認は別途必要です。
`build:server` は `.output/` へ本番用サーバーを生成します。`start:server` はルートの `.env` を読み込んで起動します。

デプロイ先では `DATABASE_URL` を環境変数で設定し、`node .output/server/index.mjs` を実行します。
`.env` はビルド成果物へ含めません。ポートは `PORT` または `NITRO_PORT` で指定できます。
