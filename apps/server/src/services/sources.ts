import { db } from '../pool.js'
import { sources } from '../db/schema/sources.js'

// ServiceはDBに値を保存する。HTTPレスポンスはRoute側で作る。
export async function insertSource(
  title: string,
  type: string | null | undefined,
  year: number | null | undefined,
) {
  const [newSource] = await db
    .insert(sources)
    .values({ title, type, year })
    .returning()
  return newSource
}
