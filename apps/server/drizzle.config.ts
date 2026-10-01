import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Generating migrations does not require a database connection.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
