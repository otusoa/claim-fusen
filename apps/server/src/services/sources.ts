import { db } from '../pool.js'
import { sources } from '../db/schema/sources.js'
import type { CreateSourceData } from '@kari-fusen/schemas'

// SourceはProjectに所属させず、複数のProjectから参照できるようにする。
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
