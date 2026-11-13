# claim-fusen Frontend

Vue 3 / Vite / Vue Router 5に、Vue版Nuxt UI v4とTailwind CSS v4を組み合わせたSPAです。
Backendは `apps/server` の独立したNitroサーバーです。

## 現在の画面

- `/` → `/projects` へ移動
- `/projects`：既存の `GET /api/projects` から取得したProjectのタイトル・説明・更新日を表示
- `/projects/new`：タイトル（必須）と説明（任意）を入力してProjectを作成
- `/projects/:projectId/claims`：Projectの「Claim一覧」から移動し、そのProjectに所属するClaimだけを表示
- `/claims/:claimId`：Claim一覧の「詳細を見る」から移動し、本文・status・関係・Evidence・出典を表示
- 読み込み中、データなし、取得失敗と再試行の表示
- 未定義のURL：404画面からProject一覧へ戻る

Project一覧からClaim一覧、Claim詳細まで辿れます。詳細から所属ProjectのClaim一覧へ戻れます。
Claim一覧にはタイトル・本文の抜粋・管理上のstatus・更新日を表示し、更新日の新しい順に並べます。
Project IDが不正なURLと存在しないProjectは、空のClaim一覧とは分けて表示します。
Claim詳細は既存の `GET /api/claims/:claimId` を使用します。本文・引用・要約はプレーンテキストとして改行を保持します。
関係の種類は日本語と英語で表示し、関係の補足・引用箇所・Evidenceのメモ・出典の種別と年も確認できます。
出典URLはHTTP／HTTPSの絶対URLのみリンクにし、それ以外は文字列として表示します。

Project一覧の上部と空状態の「Projectを作成」から作成画面を開けます。
共有の `createProjectSchema` で検証して `POST /api/projects` へ送信し、作成後はそのProjectのClaim一覧へ移動します。
タイトルは前後の空白を除去し、未入力の説明はnullとして送ります。説明の改行は保持します。
送信中は入力・作成・キャンセル操作を無効にします。作成に失敗しても入力内容を保持し、自動再送はしません。
Project作成後に画面遷移だけ失敗した場合は、再登録せず作成したProjectへのリンクを表示します。

## 起動

Node.jsは `^22.18.0 || >=24.12.0` を使用します。
リポジトリのルートで依存関係をインストールします。

```powershell
pnpm install --frozen-lockfile
```

ルートの `.env` に `DATABASE_URL` を設定し、PostgreSQLと既存migrationを準備してからBackendを起動します。

```powershell
pnpm run dev:server
```

別のPowerShellでFrontendを起動します。

```powershell
pnpm run dev:web
```

Viteが表示したURLを開きます（通常は `http://localhost:5173/projects`）。
使用中のポートがあればViteが次のポートを選ぶため、ターミナルのURLを確認してください。

ブラウザからの `/api/*` は、Viteの開発用プロキシで3000番ポートのBackendへ転送します。
DB接続情報はFrontendへ渡しません。

## Nuxt UIの構成

| ファイル | 役割 |
| --- | --- |
| `vite.config.ts` | Nuxt UI Vite plugin、テーマ、開発用APIプロキシ |
| `src/main.ts` | CSSとNuxt UI Vue pluginの登録 |
| `src/App.vue` | 日本語localeを設定したUAppと共通レイアウト |
| `src/assets/css/main.css` | Tailwind CSS / Nuxt UIの読み込み |
| `src/router/index.ts` | Vue Routerの画面定義 |
| `src/api/projects.ts` | Project一覧の取得・作成、作成時のHTTPエラー、日時を文字列として扱う画面用の型 |
| `src/views/ProjectsView.vue` | Project一覧と各取得状態の表示 |
| `src/views/ProjectCreateView.vue` | 入力検証・作成・二重送信防止・作成後の遷移 |
| `src/api/claims.ts` | Claim一覧・詳細の型と取得、HTTPエラーの区別 |
| `src/views/ClaimsView.vue` | 選択したProjectのClaim一覧、空一覧、不正URL、不在、再試行の表示 |
| `src/views/ClaimDetailView.vue` | Claim本文・関係・Evidence・出典と、詳細の取得状態の表示 |
| `src/utils/source-url.ts` | 出典URLをHTTP／HTTPSの絶対URLに限定 |

Nuxt UIのコンポーネントは自動importされます。自分のAPI関数とVueの関数は明示的にimportします。
アイコンは `@iconify-json/lucide` を利用し、ビルド時に同梱します。

Nuxt UIが生成する `auto-imports.d.ts` / `components.d.ts` はGit管理対象外です。
`build` はViteで型宣言を生成してからVueの型チェックを実行する順序にしています。

## 確認

```powershell
pnpm run build:web
pnpm --filter @kari-fusen/web exec eslint src vite.config.ts
node --test apps/web/test/source-url.test.mjs
node --test apps/web/test/projects-api.test.mjs apps/web/test/project-create.test.mjs
```

Backendを起動した状態で、一覧がAPIのProjectと一致することと、再読み込みが動くことを確認します。
空の開発DBではデータなしの表示、Backend停止時はエラー表示と再試行を確認できます。
不明なURLから一覧へ戻れること、狭い画面で内容が収まることも確認します。
Projectの「Claim一覧」を開き、そのProjectのClaimだけが表示されることを確認します。
別のProjectへの移動やURLの直接入力、ブラウザの戻る・進むでもProjectが切り替わります。
ClaimがないProjectでは空一覧、存在しないProjectでは不在の表示になります。

Project作成は開発用DBまたはAPIレスポンスのモックで次を確認します。

Project作成の自動テストはAPIの送信内容と、Vueの画面ロジック・メモリ上のルーターによる送信と遷移を検証します。
通知とHTTP応答を差し替えるため、実DBへの登録やブラウザの見た目の検証は行いません。

- 一覧の上部・空状態から作成画面を開ける。キャンセルでは登録せず一覧へ戻る。
- 空欄・空白だけのタイトルは送信されない。正常作成時は成功通知と作成したProjectの空Claim一覧を表示する。
- タイトル前後の空白が除去され、説明なしはnull、複数行の説明は改行を保持して登録される。
- 送信中は入力・作成・キャンセルを操作できず、連続クリックやEnterでPOSTが重複しない。
- 400・500・通信失敗時は入力を保持し、400では入力確認、その他では作成成否の確認と再試行を案内する。
- 作成成功後にルーティングだけ失敗しても再POSTせず、作成したProjectを開くリンクを表示する。
- 送信中に画面を離れた場合、遅れて完了しても通知や自動画面遷移を行わない。POSTの中断による作成取り消しは行わない。

Claim詳細は次の項目を確認します。未登録の状態や特殊な値は、開発用データまたはAPIレスポンスのモックで確認します。

- 一覧の「詳細を見る」、直接URL入力、ブラウザの戻る・進む、所属ProjectのClaim一覧への復帰。
- タイトル・status・更新日・本文、4種類の関係、引用・要約・出典がAPIの値と一致する。
- 本文が空の場合は「本文は未登録」、関係が空の場合は「関連するEvidenceはありません」。任意項目のnullで表示が壊れない。
- 長文・改行・長いURLが狭い画面でも収まる。HTMLを含む本文・引用・要約は文字列として表示される。
- HTTP／HTTPSの出典URLは別タブで開き、`javascript:`・`data:`・相対URL・不正なURLはリンクにならない。
- `/claims/not-a-uuid` は不正URL、存在しないUUIDは不在、通信失敗・500は取得エラーと再試行を表示する。
- Claim IDを素早く切り替えた場合と画面離脱時に、古い取得結果が表示を上書きしない。

## 本番配信

`pnpm run build:web` で `apps/web/dist/` を生成します。
本番環境では同じオリジンの `/api/*` をNitroへ転送し、Frontendの画面URLは `index.html` へフォールバックする設定が必要です。
Viteの開発用プロキシはビルド成果物には含まれません。

参考：[Nuxt UIのVue向け導入手順](https://ui.nuxt.com/docs/getting-started/installation/vue)
