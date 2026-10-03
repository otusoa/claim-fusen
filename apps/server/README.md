# Projects APIを少しずつ実装する

コードを読み、動作を確認しながら進めるための道しるべです。
今回はGETのService分離を見本として実装しています。POSTのService分離は次の作業として残しています。

参考資料：

- [Hono API基盤と最小API](https://outline-wiki.pitamai.com/doc/3-hono-apiapi-8eviPjguLT)
- [DrizzleスキーマInit](https://outline-wiki.pitamai.com/doc/2-drizzleinit-mhjKRATQUp)

## 1. 現在のコードを読む

| ファイル | 役割 |
| --- | --- |
| `src/index.ts` | HTTP受付、入力チェック、JSONレスポンス、起動 |
| `src/services/projects.ts` | Project一覧のDB取得 |
| `src/pool.ts` | 環境変数からPostgreSQL接続を用意 |
| `src/db/index.ts` | Drizzle Clientを作る |
| `src/db/schema/projects.ts` | Projectのテーブル定義 |

| Method / Path | 成功時 |
| --- | --- |
| `GET /health` | 200、`{"status":"ok"}` |
| `GET /projects` | 200、Projectの配列。データがなければ `[]` |
| `POST /projects` | 201、作成したProjectのオブジェクト |

資料では `/api/projects` ですが、現在のコードは `/projects` です。
以下は現在のパスで確認します。パスの統一は別の小さな変更として行います。

## 2. GETの見本を確認する

```text
GET /projects
  → listProjects()
  → db.query.projects.findMany()
  → Routeでc.json(projectList)
```

`listProjects()` はHonoのContextを受け取らず、DBから取得した値を返します。
HTTPのステータスやJSONへの変換はRouteの仕事です。
まず `index.ts` と `services/projects.ts` を見比べてください。
今回の変更はDB処理の移動です。一覧の順序はまだ指定していません。

## 3. 起動して既存のGET / POSTを確認する

PostgreSQLが起動し、既存のmigrationが適用されていることを前提とします。
接続先はルートの `.env.example` を参考に、ルートの `.env` に設定します。
すでに設定済みなら、その設定を使います。

リポジトリのルートで、PowerShellから起動：

```powershell
pnpm run dev:server
```

別のPowerShellで確認：

```powershell
Invoke-RestMethod -Uri 'http://localhost:3000/health'
Invoke-RestMethod -Uri 'http://localhost:3000/projects'
```

POSTの確認は接続先DBに1件保存します。開発用DBで行ってください。

```powershell
curl -i http://localhost:3000/projects   -H 'Content-Type: application/json'   -d '{"title":"ああ","description":null}'
```

確認ポイント：POSTが201で、`id`、`title`、`description`、日時を返し、GETに同じIDが含まれること。
`title` が `""`、空白だけ、数値、未指定の場合は400になることも確認します。
`description` は文字列・null・省略を受け付けます。数値なら400です。
空白を前後に含むtitleは、trimされた値が保存されます。

JSONの検証には `Content-Type: application/json` が必要です。
仕組みは [HonoのValidationガイド](https://hono.dev/docs/guides/validation) を参照してください。

## 4. 次に自分で実装する：POSTのService分離

GETの変更を確認してから、以下を行います。

1. `src/services/projects.ts` に `CreateProjectInput` 型を追加する。
   `title: string` と `description?: string | null` を持つ型にします。
2. 同じファイルに `createProject(input: CreateProjectInput)` を追加する。
3. POST内の `.insert(projects).values(...).returning()` をこの関数へ移す。
   `projects` のimportもService側へ追加し、作成した1件を返します。
4. Routeには `zValidator`、`c.req.valid('json')`、Serviceの呼び出し、`c.json(..., 201)` を残す。
5. `index.ts` で不要になったDB・テーブルのimportを削除する。

完成時の流れ：

```text
POST /projects
  → zValidatorで入力チェック
  → c.req.valid('json')で検証済みの値を取り出す
  → createProject(body)で保存
  → Routeでc.json(newProject, 201)
```

Serviceへ `c` を渡す必要はありません。引数は保存する値、戻り値は作成したProjectです。
移動後にルートで `pnpm typecheck` を実行し、上のPOST→GETを再確認します。
同じ入力で同じレスポンスになることが、この段階の完了条件です。

## 5. その後の小さな作業

POSTの分離を確認してから、次を一つずつ進めます。

1. GET / POSTのパスを資料の `/api/projects` に揃え、確認コマンドも更新する。
2. 不正なJSONが400になることを確認する。
3. 想定外のDBエラーを500の固定JSONへ整える。SQLや接続情報、生のエラーメッセージをレスポンスへ出さない。
4. Projectsが動くことを確認してから、Sourceの作成へ進む。

Projectのtitleには一意制約がないため、同じtitleのPOSTも新しいProjectを作ります。
現段階では重複タイトルを409にする必要はありません。
