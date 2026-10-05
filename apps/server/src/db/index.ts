import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as tables from './schema/index';
import * as relations from './relations';

// Poolの管理は呼び出し元に任せ、テーブルとrelationsをdb.queryで使えるよう登録する。
export function createDb(pool: Pool) {
  return drizzle(pool, { schema: { ...tables, ...relations } });
}
