import { defineErrorHandler } from 'nitro'

export default defineErrorHandler((error) => {
  // 開発時もSQL・接続情報・スタックトレースをHTTPレスポンスへ出さない。
  if (error.unhandled || error.status >= 500) {
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  // 入力・参照先・重複のエラーは既存APIの固定テキストを維持する。
  return new Response(error.message, {
    status: error.status,
    headers: { 'Content-Type': 'text/plain; charset=UTF-8' },
  })
})
