# 共有API入力スキーマ

serverとwebで使う入力チェック、許可値、入力型を定義します。
DB接続や参照先の存在確認はserverのServiceに置きます。

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
