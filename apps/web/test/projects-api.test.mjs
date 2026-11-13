import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProject, ProjectCreationError } from '../src/api/projects.ts'

const project = {
  id: '33d2ce62-ac6e-4937-93c7-52de098926eb',
  title: '研究テーマ',
  description: null,
  createdAt: '2026-11-13T00:00:00.000Z',
  updatedAt: '2026-11-13T00:00:00.000Z',
}

test('creates a Project using JSON and preserves the returned ID and date strings', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(project, { status: 201 }))
  const input = { title: '  研究テーマ  ', description: '目的\n調査する範囲' }
  assert.deepEqual(await createProject(input), project)
  const [url, request] = fetch.mock.calls[0].arguments
  assert.equal(url, '/api/projects')
  assert.equal(request.method, 'POST')
  assert.deepEqual(request.headers, { Accept: 'application/json', 'Content-Type': 'application/json' })
  assert.deepEqual(JSON.parse(request.body), { title: '研究テーマ', description: '目的\n調査する範囲' })
  assert.equal(input.title, '  研究テーマ  ')
  assert.equal(fetch.mock.callCount(), 1)
})

test('sends null for an omitted, empty or null description', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(project, { status: 201 }))
  for (const description of [undefined, '', null]) {
    await createProject({ title: project.title, description })
    assert.equal(JSON.parse(fetch.mock.calls.at(-1).arguments[1].body).description, null)
  }
})

test('rejects empty and whitespace-only titles without sending a request', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected request') })
  for (const title of ['', '  \n\t ']) {
    await assert.rejects(createProject({ title }))
  }
  assert.equal(fetch.mock.callCount(), 0)
})

test('keeps HTTP error status without exposing server response text or retrying', async (t) => {
  let status = 400
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('private server detail', { status }))
  for (status of [400, 500, 200]) {
    await assert.rejects(createProject({ title: project.title }), (error) => {
      assert.ok(error instanceof ProjectCreationError)
      assert.equal(error.status, status)
      assert.equal(error.message, 'Projectを作成できませんでした')
      return true
    })
  }
  assert.equal(fetch.mock.callCount(), 3)
})

test('propagates network failure without an automatic POST retry', async (t) => {
  const failure = new TypeError('network unavailable')
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw failure })
  await assert.rejects(createProject({ title: project.title }), (error) => error === failure)
  assert.equal(fetch.mock.callCount(), 1)
})
