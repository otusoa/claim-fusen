# 共有API入力スキーマ

serverで使う入力チェック、許可値、入力型を定義します。今後のFrontend再構築でも共有できるパッケージです。
DB接続や参照先の存在確認はserverのServiceに置きます。

Sourceのurlは任意で、HTTP／HTTPSの絶対URLに限定します。
Evidenceは引用または要約に空白以外の内容が必要です。両方空の新規作成は400になります。
引用・要約の空白や改行は検証後も変更しません。既存レコードに対するmigrationは不要です。

更新用に `updateClaimSchema`・`updateProjectSchema`・`updateSourceSchema`・`updateEvidenceSchema`・`updateClaimEvidenceSchema` を公開しています。
更新は部分入力とし、空オブジェクト・未知の項目・変更不可の項目を拒否します。省略項目にデフォルト値は追加しません。
各 `Update*Input` は入力型、`Update*Data` は検証後にServiceへ渡す型です。
Evidenceの更新後の引用／要約の必須判定は、Serviceが保存済みの内容と結合してから `createEvidenceSchema` を使って行います。
更新スキーマ単体では、保存済みの引用／要約を参照する検証は行いません。

```ts
import { createClaimSchema, type CreateClaimInput, type CreateClaimData } from '@kari-fusen/schemas'

// 送信前の型。statusは省略可能。
const input: CreateClaimInput = { projectId, title: '研究上の主張' }
// 検証後の型。statusにはactiveが入る。
const data: CreateClaimData = createClaimSchema.parse(input)
```

ルートで `pnpm install` してworkspaceをリンクします。
各アプリのdev・build・型チェックは共有パッケージを先にビルドします。
共有スキーマを変更したらdevコマンドを再起動してください。
明示的に再ビルドする場合は `pnpm --filter @kari-fusen/schemas build` を使います。

exportsは生成したJavaScriptと型宣言を公開するため、serverのビルド後も通常のNode.jsで利用できます。
`z.input` は検証前、`z.output` は検証後の型です。ServiceではData型を使います。
