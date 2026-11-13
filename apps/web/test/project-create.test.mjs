import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRenderer, h, ssrContextKey } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

// DOMの見た目ではなく、実際の画面のsetupとルーターで送信の動作を検証する。
let server
let View
let notifications
before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('..', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [vue(), {
      name: 'test-notifications',
      resolveId(id) {
        if (id === '@nuxt/ui/composables/useToast' || id === 'test:toast') return '\0test-toast'
      },
      load(id) {
        if (id === '\0test-toast') return 'export const notifications = []; export function useToast() { return { add: (toast) => notifications.push(toast) } }'
      },
    }],
    resolve: { alias: {
      '@nuxt/ui/composables/useToast': 'test:toast',
      '@': fileURLToPath(new URL('../src', import.meta.url)),
    } },
    server: { middlewareMode: true },
    appType: 'custom',
  })
  View = (await server.ssrLoadModule('/src/views/ProjectCreateView.vue')).default
  notifications = (await server.ssrLoadModule('test:toast')).notifications
})
after(async () => { await server?.close() })

const renderer = createRenderer({
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  insert() {},
  remove() {},
  setText() {},
  setElementText() {},
  patchProp() {},
  parentNode: () => null,
  nextSibling: () => null,
})

async function mount(t) {
  notifications.length = 0
  const empty = { render: () => null }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/projects', component: empty },
      { path: '/projects/new', component: empty },
      { path: '/projects/:projectId/claims', name: 'project-claims', component: empty },
    ],
  })
  await router.push('/projects/new')
  let state
  const app = renderer.createApp({
    ...View,
    setup(props, context) {
      state = View.setup(props, context)
      return state
    },
    render: () => h('test-root'),
  })
  app.use(router)
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount({})
  let mounted = true
  function unmount() {
    if (mounted) app.unmount()
    mounted = false
  }
  t.after(unmount)
  state.state.title = '研究テーマ'
  state.state.description = '目的\n範囲'
  return { state, router, unmount }
}

const project = { id: '33d2ce62-ac6e-4937-93c7-52de098926eb', title: '研究テーマ' }
const submit = (state) => state.onSubmit({ data: { ...state.state } })

test('blocks a second submission while pending and opens the newly created Project', async (t) => {
  const { state, router } = await mount(t)
  let resolve
  const fetch = t.mock.method(globalThis, 'fetch', () => new Promise((done) => { resolve = done }))
  const pending = submit(state)
  await submit(state)
  assert.equal(state.submitting.value, true)
  assert.equal(fetch.mock.callCount(), 1)
  resolve(Response.json(project, { status: 201 }))
  await pending
  assert.equal(router.currentRoute.value.fullPath, `/projects/${project.id}/claims`)
  assert.equal(notifications.length, 1)
  await submit(state)
  assert.equal(fetch.mock.callCount(), 1)
})

for (const status of [400, 500, 'network']) {
  test(`${status} failure keeps input and allows an explicit retry`, async (t) => {
    const { state, router } = await mount(t)
    const fetch = t.mock.method(globalThis, 'fetch', async () => {
      if (status === 'network') throw new TypeError('network unavailable')
      return new Response('failure', { status })
    })
    await submit(state)
    assert.equal(state.error.value, status === 400 ? 'invalid' : 'failed')
    assert.equal(state.state.title, '研究テーマ')
    assert.equal(state.state.description, '目的\n範囲')
    assert.equal(state.submitting.value, false)
    assert.equal(router.currentRoute.value.fullPath, '/projects/new')
    assert.equal(notifications.length, 0)
    assert.equal(fetch.mock.callCount(), 1)
    fetch.mock.mockImplementation(async () => Response.json(project, { status: 201 }))
    await submit(state)
    assert.equal(fetch.mock.callCount(), 2)
    assert.equal(router.currentRoute.value.params.projectId, project.id)
    assert.equal(state.error.value, null)
  })
}

for (const failure of ['cancelled', 'exception']) {
  test(`a ${failure} navigation after creation never reposts the Project`, async (t) => {
    const { state, router } = await mount(t)
    const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(project, { status: 201 }))
    if (failure === 'cancelled') router.beforeEach(() => false)
    else t.mock.method(router, 'replace', async () => { throw new Error('navigation failed') })
    await submit(state)
    assert.equal(state.createdProject.value.id, project.id)
    assert.equal(state.navigationFailed.value, true)
    assert.equal(state.error.value, null)
    await submit(state)
    assert.equal(fetch.mock.callCount(), 1)
    assert.equal(notifications.length, 1)
  })
}

test('leaving before the POST completes suppresses late notification and navigation', async (t) => {
  const { state, router, unmount } = await mount(t)
  const replace = t.mock.method(router, 'replace')
  let resolve
  t.mock.method(globalThis, 'fetch', () => new Promise((done) => { resolve = done }))
  const pending = submit(state)
  await router.push('/projects')
  assert.equal(router.currentRoute.value.fullPath, '/projects')
  unmount()
  resolve(Response.json(project, { status: 201 }))
  await pending
  assert.equal(replace.mock.callCount(), 0)
  assert.equal(notifications.length, 0)
  assert.equal(state.createdProject.value, null)
})

test('cancelling without submitting does not create a Project', async (t) => {
  const { router, unmount } = await mount(t)
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected POST') })
  await router.push('/projects')
  unmount()
  assert.equal(fetch.mock.callCount(), 0)
  assert.equal(notifications.length, 0)
})
