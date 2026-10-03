import { Pool } from 'pg'
import { createDb } from './db/index.js'
import 'dotenv/config'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

export const pool = new Pool({ connectionString: databaseUrl })
export const db = createDb(pool)