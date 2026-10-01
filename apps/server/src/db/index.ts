import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as tables from './schema/index.js';
import * as relations from './relations.js';

// The caller owns the pool and its lifecycle. Importing schemas never connects to a DB.
export function createDb(pool: Pool) {
  return drizzle(pool, { schema: { ...tables, ...relations } });
}
