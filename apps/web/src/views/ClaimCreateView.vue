<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { createClaimSchema, type ClaimStatus, type CreateClaimData } from '@kari-fusen/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'
import { createClaim } from '@/api/claims'
import { ApiRequestError } from '@/api/http'
import { useCreation } from '@/composables/useCreation'
import { useProject } from '@/composables/useProject'
import CreationFeedback from '@/components/CreationFeedback.vue'
import ProjectStatus from '@/components/ProjectStatus.vue'

const props = defineProps<{ projectId: string }>()
const project = useProject(() => props.projectId)
const { data: currentProject, loading, error: projectError, refresh } = project
const state = reactive({ title: '', body: '', status: 'active' as ClaimStatus })
const formState = computed(() => ({ ...state, projectId: props.projectId }))
const statusItems = [{ label: '下書き', value: 'draft' }, { label: '進行中', value: 'active' }, { label: 'アーカイブ', value: 'archived' }]
const task = useCreation(createClaim, {
  title: 'Claimを作成しました', scope: () => props.projectId,
  destination: (claim) => ({ name: 'claim-detail', params: { claimId: claim.id } }),
})
const { submitting, created, error, navigationFailed } = task
const contextError = computed(() => error.value instanceof ApiRequestError && error.value.reason === 'project_not_found' ? error.value : projectError.value)
watch(() => props.projectId, () => { state.title = ''; state.body = ''; state.status = 'active' }, { flush: 'sync' })
function onSubmit(event: FormSubmitEvent<CreateClaimData>) {
  if (!currentProject.value || loading.value || contextError.value) return
  return task.submit({ ...event.data, projectId: props.projectId })
}
</script>

<template>
  <section aria-labelledby="claim-create-heading" :aria-busy="loading || submitting" class="max-w-2xl">
    <h1 id="claim-create-heading" class="mb-6 text-3xl font-semibold">Claimを作成</h1>
    <ProjectStatus :loading="loading" :error="contextError" @retry="refresh" />
    <div v-if="currentProject && !contextError">
      <p class="mb-8 text-sm text-primary wrap-anywhere">{{ currentProject.title }}</p>
      <CreationFeedback :error="error" :created="!!created" :navigation-failed="navigationFailed" :destination="created ? { name: 'claim-detail', params: { claimId: created.id } } : undefined" />
      <UForm :schema="createClaimSchema" :state="formState" :disabled="submitting || !!created" :loading-auto="false" novalidate class="space-y-6" @submit="onSubmit">
        <UFormField name="title" label="タイトル" required><UInput v-model="state.title" required class="w-full" /></UFormField>
        <UFormField name="body" label="本文" hint="任意"><UTextarea v-model="state.body" :rows="8" autoresize :maxrows="20" class="w-full" /></UFormField>
        <UFormField name="status" label="status" required><USelect v-model="state.status" :items="statusItems" class="w-full" /></UFormField>
        <div class="flex flex-wrap gap-3"><UButton type="submit" label="作成する" :loading="submitting" :disabled="submitting || !!created" /><UButton :to="{ name: 'project-claims', params: { projectId } }" label="キャンセル" color="neutral" variant="outline" :disabled="submitting" /></div>
      </UForm>
    </div>
  </section>
</template>
