import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as tables from './schema/index.js';
import * as relations from './relations.js';

// The caller owns the pool and its lifecycle. Importing schemas never connects to a DB.
// ja: プールとそのライフサイクルは呼び出し元が所有します。スキーマをインポートしてもDBには接続されません。
export function createDb(pool: Pool) {
  return drizzle(pool, { schema: { ...tables, ...relations } });
}
