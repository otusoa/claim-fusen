import { createProjectSchema, type CreateProjectInput } from '@kari-fusen/schemas'

// HTTPではDBのtimestampがISO文字列になるため、画面用の型を定義する。
export interface Project {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export async function listProjects(signal?: AbortSignal): Promise<Project[]> {
  const response = await fetch('/api/projects', {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) {
    throw new Error('Project一覧を取得できませんでした')
  }
  return response.json()
}

export class ProjectCreationError extends Error {
  readonly status: number

  constructor(status: number) {
    super('Projectを作成できませんでした')
    this.status = status
  }
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const data = createProjectSchema.parse(input)
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: data.title,
      description: data.description === '' ? null : data.description ?? null,
    }),
  })
  if (response.status !== 201) throw new ProjectCreationError(response.status)
  return response.json()
}
