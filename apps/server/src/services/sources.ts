import { db } from '../pool.js'
import { asc, desc, eq } from 'drizzle-orm'
import { sources } from '../db/schema/sources.js'
import type { CreateSourceData, UpdateSourceData } from '@kari-fusen/schemas'

export async function updateSource(sourceId: string, input: UpdateSourceData) {
  const [source] = await db.update(sources).set({ ...input, updatedAt: new Date() })
    .where(eq(sources.id, sourceId)).returning()
  return source ?? null
}

export async function findSourceById(sourceId: string) {
  return await db.query.sources.findFirst({ where: eq(sources.id, sourceId) }) ?? null
}

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
