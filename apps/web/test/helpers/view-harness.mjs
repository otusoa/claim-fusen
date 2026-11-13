import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRenderer, h, nextTick, reactive, ssrContextKey } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

export async function settle() {
  for (let i = 0; i < 4; i++) { await new Promise(setImmediate); await nextTick() }
}

export async function createHarness() {
  const server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../..', import.meta.url)),
    optimizeDeps: { noDiscovery: true, include: [] },
    plugins: [vue(), {
      name: 'test-notifications',
      resolveId: (id) => id === 'test:toast' ? '\0test-toast' : undefined,
      load: (id) => id === '\0test-toast' ? 'export const notifications=[];export function useToast(){return {add:(toast)=>notifications.push(toast)}}' : undefined,
    }],
    resolve: { alias: {
      '@nuxt/ui/composables/useToast': 'test:toast',
      '@': fileURLToPath(new URL('../../src', import.meta.url)),
    } },
    server: { middlewareMode: true }, appType: 'custom',
  })
  const { notifications } = await server.ssrLoadModule('test:toast')
  const renderer = createRenderer({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
    parentNode: () => null, nextSibling: () => null,
  })
  async function mount(path, t, initialProps = {}, route = '/sources/new') {
    const View = (await server.ssrLoadModule(path)).default
    notifications.length = 0
    const empty = { render: () => null }
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/sources', name: 'sources', component: empty },
      { path: '/sources/new', name: 'source-create', component: empty },
      { path: '/projects', name: 'projects', component: empty },
      { path: '/projects/:projectId/claims', name: 'project-claims', component: empty },
      { path: '/projects/:projectId/claims/new', name: 'claim-create', component: empty },
      { path: '/claims/:claimId', name: 'claim-detail', component: empty },
      { path: '/projects/:projectId/evidences', name: 'project-evidences', component: empty },
      { path: '/projects/:projectId/evidences/new', name: 'evidence-create', component: empty },
    ] })
    await router.push(route)
    const props = reactive(initialProps)
    let vm
    const events = []
    const Wrapped = { ...View, setup(p, context) {
      vm = View.setup(p, { ...context, emit: (name, ...args) => events.push({ name, args }) })
      return vm
    }, render: () => h('test-root') }
    const app = renderer.createApp({ render: () => h(Wrapped, props) })
    app.use(router)
    app.provide(ssrContextKey, { modules: new Set() })
    app.mount({})
    let mounted = true
    const unmount = () => { if (mounted) app.unmount(); mounted = false }
    t.after(unmount)
    await settle()
    return { vm, props, router, unmount, events, notifications }
  }
  return { load: (path) => server.ssrLoadModule(path), mount, close: () => server.close() }
}
