import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { createHarness, settle } from './helpers/view-harness.mjs'

let harness
before(async () => { harness = await createHarness() })
after(async () => { await harness?.close() })

const projectId = '33d2ce62-ac6e-4937-93c7-52de098926eb'
const sourceId = 'a83dcc8e-566d-4bb9-9e4a-74e920c822b7'
const source = { id: sourceId, title: '出典', year: null, type: null, url: null }
const claimId = 'e4fd870f-6f65-4601-b0fc-80a73aed49ad'
const evidenceId = 'cf1e1984-56d1-42b0-a34c-fd685d162a9b'

function evidenceFetch(t, post = async () => Response.json({ id: evidenceId }, { status: 201 }), items = [source]) {
  return t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url === '/api/projects') return Response.json([{ id: projectId }, { id: claimId }])
    if (url === '/api/sources') return Response.json(items)
    return post(url, options)
  })
}

test('Evidence uses the fixed Project and selected Source and preserves quote whitespace', async (t) => {
  const fetch = evidenceFetch(t)
  const { vm, router } = await harness.mount('/src/views/EvidenceCreateView.vue', t, { projectId })
  Object.assign(vm.state, { sourceId, quote: ' 引用\n 次の行 ', locator: '3頁' })
  await vm.onSubmit({ data: vm.formState.value })
  const body = JSON.parse(fetch.mock.calls.at(-1).arguments[1].body)
  assert.deepEqual(body, { projectId, sourceId, quote: ' 引用\n 次の行 ', summary: null, locator: '3頁', note: null })
  assert.equal(router.currentRoute.value.name, 'project-evidences')
  assert.equal(router.currentRoute.value.params.projectId, projectId)
})

test('Evidence with no content or no existing Source cannot POST', async (t) => {
  const fetch = evidenceFetch(t)
  const { vm } = await harness.mount('/src/views/EvidenceCreateView.vue', t, { projectId })
  vm.state.sourceId = sourceId
  vm.state.quote = ' \n '
  await vm.onSubmit({ data: vm.formState.value })
  assert.ok(vm.error.value)
  vm.state.sourceId = ''
  vm.state.summary = '要約だけで登録できる'
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(fetch.mock.calls.filter((call) => call.arguments[1]?.method === 'POST').length, 0)
  vm.state.sourceId = sourceId
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(vm.created.value.id, evidenceId)
})

test('Source modal keeps Evidence content on cancel, locks while saving, and selects a newly created Source', async (t) => {
  evidenceFetch(t)
  const { vm } = await harness.mount('/src/views/EvidenceCreateView.vue', t, { projectId })
  Object.assign(vm.state, { sourceId, quote: '入力途中の引用', summary: '入力途中の要約' })
  vm.setSourceOpen(true)
  vm.sourceBusy.value = true
  vm.setSourceOpen(false)
  assert.equal(vm.sourceOpen.value, true)
  vm.sourceBusy.value = false
  vm.setSourceOpen(false)
  assert.equal(vm.state.quote, '入力途中の引用')
  assert.equal(vm.state.sourceId, sourceId)
  vm.setSourceOpen(true)
  vm.onSourceCreated({ ...source, id: claimId, title: '新しい出典' })
  assert.equal(vm.sourceOpen.value, false)
  assert.equal(vm.state.sourceId, claimId)
  assert.equal(vm.sourceOptions.value.length, 2)
  assert.equal(vm.state.summary, '入力途中の要約')
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(vm.created.value.id, evidenceId)
})

test('Source not found keeps Evidence text, clears selection and reloads Sources', async (t) => {
  const fetch = evidenceFetch(t, async () => new Response('Source not found', { status: 404 }))
  const { vm } = await harness.mount('/src/views/EvidenceCreateView.vue', t, { projectId })
  Object.assign(vm.state, { sourceId, quote: '保持する引用' })
  await vm.onSubmit({ data: vm.formState.value })
  await settle()
  assert.equal(vm.sourceMissing.value, true)
  assert.equal(vm.state.sourceId, '')
  assert.equal(vm.state.quote, '保持する引用')
  assert.equal(fetch.mock.calls.filter((call) => call.arguments[0] === '/api/sources').length, 2)
  assert.equal(fetch.mock.calls.filter((call) => call.arguments[1]?.method === 'POST').length, 1)
})

test('Project not found on Evidence POST is distinct from Source not found', async (t) => {
  evidenceFetch(t, async () => new Response('Project not found', { status: 404 }))
  const { vm } = await harness.mount('/src/views/EvidenceCreateView.vue', t, { projectId })
  Object.assign(vm.state, { sourceId, quote: '引用' })
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(vm.contextError.value.reason, 'project_not_found')
  assert.equal(vm.sourceMissing.value, false)
})

test('Evidence prevents duplicates while pending and after a failed navigation', async (t) => {
  let finish
  const fetch = evidenceFetch(t, () => new Promise((resolve) => { finish = resolve }))
  const { vm, router } = await harness.mount('/src/views/EvidenceCreateView.vue', t, { projectId })
  router.beforeEach(() => false)
  Object.assign(vm.state, { sourceId, summary: '要約' })
  const pending = vm.onSubmit({ data: vm.formState.value })
  await vm.onSubmit({ data: vm.formState.value })
  finish(Response.json({ id: evidenceId }, { status: 201 }))
  await pending
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(vm.navigationFailed.value, true)
  assert.equal(fetch.mock.calls.filter((call) => call.arguments[1]?.method === 'POST').length, 1)
})

test('late GET results do not update a page after unmount', async (t) => {
  let finish
  let signal
  t.mock.method(globalThis, 'fetch', (_, options) => {
    signal = options.signal
    return new Promise((resolve) => { finish = resolve })
  })
  const { vm, unmount } = await harness.mount('/src/views/SourcesView.vue', t)
  unmount()
  assert.equal(signal.aborted, true)
  finish(Response.json([source]))
  await settle()
  assert.equal(vm.sources.value, null)
})

test('Evidence list requests the route Project and ignores stale results after Project switch', async (t) => {
  let oldFinish
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url === '/api/projects') return Response.json([{ id: projectId }, { id: claimId }])
    const id = new URL(url, 'http://localhost').searchParams.get('projectId')
    if (id === projectId) return new Promise((resolve) => { oldFinish = resolve })
    return Response.json([{ id: evidenceId, projectId: id, source }])
  })
  const { vm, props } = await harness.mount('/src/views/EvidencesView.vue', t, { projectId })
  props.projectId = claimId
  await settle()
  oldFinish(Response.json([{ id: 'old-result', projectId, source }]))
  await settle()
  assert.equal(vm.evidences.value[0].projectId, claimId)
  assert.equal(vm.currentProject.value.id, claimId)
})

test('Claim creation uses the current Project, defaults active and preserves body whitespace', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async (url) => url === '/api/projects'
    ? Response.json([{ id: projectId, title: '研究' }]) : Response.json({ id: claimId, projectId }, { status: 201 }))
  const { vm, router } = await harness.mount('/src/views/ClaimCreateView.vue', t, { projectId }, `/projects/${projectId}/claims/new`)
  assert.equal(vm.state.status, 'active')
  Object.assign(vm.state, { title: ' 主張 ', body: ' 本文\n次の段落 ' })
  await vm.onSubmit({ data: vm.formState.value })
  const body = JSON.parse(fetch.mock.calls.at(-1).arguments[1].body)
  assert.deepEqual(body, { projectId, title: '主張', body: ' 本文\n次の段落 ', status: 'active' })
  assert.equal(router.currentRoute.value.name, 'claim-detail')
  assert.equal(router.currentRoute.value.params.claimId, claimId)
})

test('invalid and missing Projects cannot submit Claims', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json([]))
  const { vm, props } = await harness.mount('/src/views/ClaimCreateView.vue', t, { projectId: 'invalid' })
  await vm.onSubmit({ data: { projectId, title: '主張' } })
  assert.equal(fetch.mock.callCount(), 0)
  props.projectId = projectId
  await settle()
  await vm.onSubmit({ data: { projectId, title: '主張' } })
  assert.equal(fetch.mock.callCount(), 1)
  assert.equal(vm.contextError.value.status, 404)
})

test('late Claim creation after a Project switch cannot redirect or overwrite the new form', async (t) => {
  let finish
  t.mock.method(globalThis, 'fetch', async (url) => url === '/api/projects'
    ? Response.json([{ id: projectId }, { id: sourceId }]) : new Promise((resolve) => { finish = resolve }))
  const { vm, props, router, notifications } = await harness.mount('/src/views/ClaimCreateView.vue', t, { projectId })
  vm.state.title = '前のProjectの主張'
  const pending = vm.onSubmit({ data: vm.formState.value })
  props.projectId = sourceId
  await settle()
  assert.equal(vm.state.title, '')
  finish(Response.json({ id: claimId }, { status: 201 }))
  await pending
  assert.equal(vm.created.value, null)
  assert.equal(notifications.length, 0)
  assert.equal(router.currentRoute.value.name, 'source-create')
})

test('Source form leaves a blank year null and submits a trimmed title and URL', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json(source, { status: 201 }))
  const { vm, events } = await harness.mount('/src/components/SourceForm.vue', t)
  Object.assign(vm.state, { title: ' 出典 ', url: ' https://example.com/paper ' })
  assert.equal(vm.formState.value.year, null)
  await vm.onSubmit({ data: vm.formState.value })
  assert.deepEqual(JSON.parse(fetch.mock.calls[0].arguments[1].body), { title: '出典', type: null, year: null, url: 'https://example.com/paper' })
  assert.ok(events.some((e) => e.name === 'created' && e.args[0].id === sourceId))
  assert.ok(events.some((e) => e.name === 'busy' && e.args[0] === true))
  assert.ok(events.some((e) => e.name === 'busy' && e.args[0] === false))
})

test('Source form rejects fractional years and unsafe URLs before POST', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected') })
  const { vm } = await harness.mount('/src/components/SourceForm.vue', t)
  Object.assign(vm.state, { title: '出典', year: '1.5' })
  await vm.onSubmit({ data: vm.formState.value })
  assert.ok(vm.error.value)
  vm.state.year = ''
  vm.state.url = 'javascript:alert(1)'
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(fetch.mock.callCount(), 0)
})

test('Source form prevents duplicate submissions and redirects only in standalone mode', async (t) => {
  let finish
  const fetch = t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { finish = resolve }))
  const { vm, router } = await harness.mount('/src/components/SourceForm.vue', t, { redirect: true })
  vm.state.title = '出典'
  const pending = vm.onSubmit({ data: vm.formState.value })
  await vm.onSubmit({ data: vm.formState.value })
  finish(Response.json(source, { status: 201 }))
  await pending
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(fetch.mock.callCount(), 1)
  assert.equal(router.currentRoute.value.name, 'sources')
})

test('Source form retains input on server error and allows explicit retry', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('secret', { status: 500 }))
  const { vm } = await harness.mount('/src/components/SourceForm.vue', t)
  Object.assign(vm.state, { title: '出典', year: '1888' })
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(vm.state.title, '出典')
  assert.equal(vm.state.year, '1888')
  assert.equal(vm.error.value.status, 500)
  fetch.mock.mockImplementation(async () => Response.json(source, { status: 201 }))
  await vm.onSubmit({ data: vm.formState.value })
  assert.equal(vm.created.value.id, sourceId)
})
