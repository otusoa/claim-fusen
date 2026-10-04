import { definePlugin } from 'nitro'
import { pool } from '../pool.js'

export default definePlugin((nitroApp) => {
  // 再読み込みや終了時に、このサーバーが作った接続を解放する。
  nitroApp.hooks.hook('close', () => pool.end())
})
