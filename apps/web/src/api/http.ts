export class ApiRequestError extends Error {
  readonly status: number
  readonly reason: 'project_not_found' | 'source_not_found' | null

  constructor(status: number, reason: ApiRequestError['reason'] = null) {
    super('リクエストに失敗しました')
    this.status = status
    this.reason = reason
  }
}

export async function requestJson<T>(url: string, options: RequestInit = {}, expectedStatus = 200): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  const response = await fetch(url, { ...options, headers })
  if (response.status !== expectedStatus) {
    const message = response.status === 404 ? await response.text() : ''
    const reason = message === 'Project not found' ? 'project_not_found'
      : message === 'Source not found' ? 'source_not_found' : null
    throw new ApiRequestError(response.status, reason)
  }
  return response.json()
}

export function postJson<T>(url: string, data: unknown): Promise<T> {
  return requestJson<T>(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  }, 201)
}
