import { db } from '../pool.js'
import { asc, desc } from 'drizzle-orm'
import { sources } from '../db/schema/sources.js'
import type { CreateSourceData } from '@kari-fusen/schemas'

export async function listSources() {
  return db.query.sources.findMany({ orderBy: [desc(sources.updatedAt), asc(sources.id)] })
}

// SourceはProjectに所属させず、複数のProjectから参照できるようにする。
export async function insertSource(
  title: CreateSourceData['title'],
  type: CreateSourceData['type'],
  year: CreateSourceData['year'],
  url?: CreateSourceData['url'],
) {
  const [newSource] = await db
    .insert(sources)
    .values({ title, type, year, url })
    .returning()
  return newSource
}
