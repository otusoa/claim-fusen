<script setup lang="ts">
import { computed, reactive, ref, useTemplateRef, watch } from 'vue'
import { createEvidenceSchema, type CreateEvidenceData } from '@kari-fusen/schemas'
import type { Form, FormSubmitEvent } from '@nuxt/ui'
import { createEvidence } from '@/api/evidences'
import { listSources, type Source } from '@/api/sources'
import { ApiRequestError } from '@/api/http'
import { useCreation } from '@/composables/useCreation'
import { useLoad } from '@/composables/useLoad'
import { useProject } from '@/composables/useProject'
import CreationFeedback from '@/components/CreationFeedback.vue'
import ProjectStatus from '@/components/ProjectStatus.vue'
import SourceForm from '@/components/SourceForm.vue'

const props = defineProps<{ projectId: string }>()
const project = useProject(() => props.projectId)
const { data: currentProject, loading, error: projectError, refresh } = project
const sources = useLoad(listSources)
const { data: sourceList, loading: sourcesLoading, error: sourcesError, refresh: refreshSources } = sources
const state = reactive({ sourceId: '', quote: '', summary: '', locator: '', note: '' })
const formState = computed(() => ({ ...state, projectId: props.projectId }))
const form = useTemplateRef<Form<typeof createEvidenceSchema>>('form')
const sourceOpen = ref(false)
const sourceBusy = ref(false)
const sourceMissing = ref(false)
const sourceOptions = computed(() => (sourceList.value ?? []).map((source) => ({
  id: source.id,
  label: [source.title, source.type, source.year].filter((part) => part !== null && part !== '').join(' / '),
  description: source.id,
})))
const task = useCreation(createEvidence, {
  title: 'Evidenceを作成しました', scope: () => props.projectId,
  destination: () => ({ name: 'project-evidences', params: { projectId: props.projectId } }),
})
const { submitting, created, error, navigationFailed } = task
const contextError = computed(() => error.value instanceof ApiRequestError && error.value.reason === 'project_not_found' ? error.value : projectError.value)
watch(error, (cause) => {
  if (cause instanceof ApiRequestError && cause.reason === 'source_not_found') {
    state.sourceId = ''
    sourceMissing.value = true
    refreshSources()
  }
})
watch(() => state.sourceId, (id) => { if (id) sourceMissing.value = false })
watch([() => state.quote, () => state.summary], () => {
  if (form.value?.getErrors('summary').length) void form.value.validate({ name: 'summary', silent: true })
})
watch(() => props.projectId, () => {
  Object.assign(state, { sourceId: '', quote: '', summary: '', locator: '', note: '' })
  sourceOpen.value = false
  sourceBusy.value = false
  sourceMissing.value = false
  form.value?.clear()
}, { flush: 'sync' })

function setSourceOpen(open: boolean) { if (!sourceBusy.value) sourceOpen.value = open }
function onSourceCreated(source: Source) {
  sourceList.value = [source, ...(sourceList.value ?? []).filter((item) => item.id !== source.id)]
  sourcesError.value = null
  state.sourceId = source.id
  sourceBusy.value = false
  sourceOpen.value = false
}
function onSubmit(event: FormSubmitEvent<CreateEvidenceData>) {
  if (!currentProject.value || loading.value || contextError.value || sourcesLoading.value || sourcesError.value || sourceOpen.value) return
  if (!sourceList.value?.some((source) => source.id === state.sourceId)) return
  return task.submit({ ...event.data, projectId: props.projectId, sourceId: state.sourceId })
}
</script>

<template>
  <section aria-labelledby="evidence-create-heading" :aria-busy="loading || submitting" class="max-w-2xl">
    <h1 id="evidence-create-heading" class="mb-6 text-3xl font-semibold">Evidenceを作成</h1>
    <ProjectStatus :loading="loading" :error="contextError" @retry="refresh" />
    <div v-if="currentProject && !contextError">
      <p class="mb-6 text-sm text-primary wrap-anywhere">{{ currentProject.title }}</p>
      <CreationFeedback :error="sourceMissing ? null : error" :created="!!created" :navigation-failed="navigationFailed" :destination="{ name: 'project-evidences', params: { projectId } }" />
      <UAlert v-if="sourceMissing" role="alert" color="warning" variant="subtle" title="Sourceが見つかりません" description="入力内容は保持しています。出典を選び直してください。" class="mb-6" />
      <UAlert v-if="sourcesError" role="alert" color="error" title="Sourceを取得できませんでした" variant="subtle" class="mb-6"><template #actions><UButton label="もう一度試す" color="error" variant="outline" @click="refreshSources" /></template></UAlert>
      <UForm ref="form" :schema="createEvidenceSchema" :state="formState" :disabled="submitting || !!created || sourceOpen" :loading-auto="false" novalidate class="space-y-6" @submit="onSubmit">
        <UFormField name="sourceId" label="Source" required description="タイトル・種別・年で検索できます。同名の出典はIDで区別できます。">
          <USelectMenu v-model="state.sourceId" :items="sourceOptions" value-key="id" :loading="sourcesLoading" :disabled="sourcesLoading || !!sourcesError" placeholder="出典を選択" class="w-full" />
          <p v-if="!sourcesLoading && !sourceList?.length && !sourcesError" class="mt-2 text-sm text-muted">Sourceはまだありません。新しく作成してください。</p>
          <UButton label="Sourceを追加" color="neutral" variant="outline" class="mt-3" :disabled="submitting || !!created || sourcesLoading" @click="setSourceOpen(true)" />
        </UFormField>
        <p class="text-sm text-muted">引用または要約のどちらかを入力してください。引用の空白・改行はそのまま保存します。</p>
        <UFormField name="quote" label="引用"><UTextarea v-model="state.quote" :rows="6" autoresize :maxrows="16" class="w-full" /></UFormField>
        <UFormField name="summary" label="要約"><UTextarea v-model="state.summary" :rows="4" autoresize :maxrows="12" class="w-full" /></UFormField>
        <UFormField name="locator" label="引用箇所" hint="任意"><UInput v-model="state.locator" placeholder="ページ・節・時刻など" class="w-full" /></UFormField>
        <UFormField name="note" label="メモ" hint="任意"><UTextarea v-model="state.note" :rows="3" autoresize :maxrows="10" class="w-full" /></UFormField>
        <div class="flex flex-wrap gap-3"><UButton type="submit" label="作成する" :loading="submitting" :disabled="submitting || !!created || sourcesLoading || !!sourcesError" /><UButton :to="{ name: 'project-evidences', params: { projectId } }" label="キャンセル" color="neutral" variant="outline" :disabled="submitting || sourceOpen" /></div>
      </UForm>
      <UModal :open="sourceOpen" :dismissible="!sourceBusy" :close="!sourceBusy" title="Sourceを追加" description="出典は全Projectで共有します。Evidenceをキャンセルしても、登録したSourceは残ります。" @update:open="setSourceOpen">
        <template #body><SourceForm v-if="sourceOpen" @created="onSourceCreated" @busy="sourceBusy = $event" @cancel="setSourceOpen(false)" /></template>
      </UModal>
    </div>
  </section>
</template>
