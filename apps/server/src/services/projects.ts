import { db } from '../pool.js'
import { projects } from '../db/schema/projects.js'
import type { CreateProjectData } from '@kari-fusen/schemas'

// ServiceはDBから値を取得する。HTTPレスポンスはRoute側で作る。
export async function listProjects() {
  return db.query.projects.findMany()
}

// ServiceはDBに値を保存する。HTTPレスポンスはRoute側で作る。
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
