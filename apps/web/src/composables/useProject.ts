import { projectParamsSchema } from '@kari-fusen/schemas'
import { listProjects } from '@/api/projects'
import { ApiRequestError } from '@/api/http'
import { useLoad } from './useLoad'

export function useProject(projectId: () => string) {
  return useLoad(async (signal) => {
    const input = projectParamsSchema.safeParse({ projectId: projectId() })
    if (!input.success) throw new ApiRequestError(400)
    const projects = await listProjects(signal)
    const project = projects.find((item) => item.id.toLowerCase() === input.data.projectId.toLowerCase())
    if (!project) throw new ApiRequestError(404, 'project_not_found')
    return project
  }, [projectId])
}
