import { db } from '../pool.js'
import { sources } from '../db/schema/sources.js'
import type { CreateSourceData } from '@kari-fusen/schemas'

// ServiceはDBに値を保存する。HTTPレスポンスはRoute側で作る。
export async function insertSource(
  title: CreateSourceData['title'],
  type: CreateSourceData['type'],
  year: CreateSourceData['year'],
) {
  const [newSource] = await db
    .insert(sources)
    .values({ title, type, year })
    .returning()
  return newSource
}
