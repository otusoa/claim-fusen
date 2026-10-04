import { db } from '../pool.js'
import { projects } from '../db/schema/projects.js'
import type { CreateProjectData } from '@kari-fusen/schemas'

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
