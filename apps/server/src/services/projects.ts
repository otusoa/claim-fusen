import { db } from '../pool.js'
import { eq } from 'drizzle-orm'
import { projects } from '../db/schema/projects.js'
import type { CreateProjectData, UpdateProjectData } from '@kari-fusen/schemas'

export async function updateProject(projectId: string, input: UpdateProjectData) {
  const [project] = await db.update(projects).set({ ...input, updatedAt: new Date() })
    .where(eq(projects.id, projectId)).returning()
  return project ?? null
}

export async function findProjectById(projectId: string) {
  return await db.query.projects.findFirst({ where: eq(projects.id, projectId) }) ?? null
}

// DBから取得した値を返す。JSONレスポンスへの変換はRouteで行う。
export async function listProjects() {
  return db.query.projects.findMany()
}

// returning()で、DBが生成したIDや日時を含む作成結果を受け取る。
export async function insertProject(
  title: CreateProjectData['title'],
  description: CreateProjectData['description'],
) {
  const [newProject] = await db
    .insert(projects)
    .values({
      title: title,
      description: description,
    })
    .returning()
  return newProject
}
