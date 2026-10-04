import { HTTPError, type H3Event } from 'nitro'
import type { ZodType, output } from 'zod'

export function parseInput<T extends ZodType>(schema: T, input: unknown): output<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new HTTPError({ status: 400, message: 'Invalid input' })
  }
  return result.data
}

export async function readJsonBody<T extends ZodType>(event: H3Event, schema: T) {
  const contentType = event.req.headers.get('content-type')?.split(';')[0]?.trim()
  if (!contentType || !/^application\/(?:[\w.-]+\+)?json$/i.test(contentType)) {
    throw new HTTPError({ status: 400, message: 'Invalid input' })
  }

  let body: unknown
  try {
    body = await event.req.json()
  } catch {
    throw new HTTPError({ status: 400, message: 'Invalid input' })
  }
  return parseInput(schema, body)
}
