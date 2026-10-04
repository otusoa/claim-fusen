import { defineHandler } from 'nitro'

// サーバーの応答確認用。DBへの接続確認は行わない。
export default defineHandler(() => ({ status: 'ok' }))
