import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { defineConfig } from 'nitro'

// 開発時はワークスペースの.envを読み込む。デプロイ時は環境変数を渡す。
config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

export default defineConfig({
  serverDir: './src',
  alias: {
    '~': fileURLToPath(new URL('./src/', import.meta.url)),
    '~~': fileURLToPath(new URL('./', import.meta.url)),
  },
  preset: 'node-server',
  errorHandler: './src/error.ts',
})
