<script setup lang="ts">
import { computed } from 'vue'
import { listEvidences } from '@/api/evidences'
import { useLoad } from '@/composables/useLoad'
import { useProject } from '@/composables/useProject'
import ProjectStatus from '@/components/ProjectStatus.vue'
import ProjectNav from '@/components/ProjectNav.vue'
import SourceDetails from '@/components/SourceDetails.vue'

const props = defineProps<{ projectId: string }>()
const project = useProject(() => props.projectId)
const result = useLoad((signal) => listEvidences(props.projectId, signal), [() => props.projectId])
const { data: currentProject } = project
const { data: evidences } = result
const loading = computed(() => project.loading.value || result.loading.value)
const error = computed(() => project.error.value || result.error.value)
const dates = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' })
function refresh() { project.refresh(); result.refresh() }
</script>

<template>
  <section aria-labelledby="evidences-heading" :aria-busy="loading">
    <UButton to="/projects" label="Project一覧へ戻る" color="neutral" variant="link" class="mb-6 px-0" />
    <ProjectNav v-if="currentProject" :project-id="currentProject.id" />
    <div class="mb-8 flex flex-wrap justify-between gap-4">
      <div><p class="mb-2 text-sm text-primary wrap-anywhere">{{ currentProject?.title }}</p><h1 id="evidences-heading" class="text-3xl font-semibold">Evidence一覧</h1></div>
      <div class="flex flex-wrap gap-3"><UButton v-if="currentProject && !error" :to="{ name: 'evidence-create', params: { projectId } }" label="Evidenceを作成" /><UButton label="再読み込み" color="neutral" variant="outline" :loading="loading" @click="refresh" /></div>
    </div>
    <ProjectStatus :loading="loading" :error="error" @retry="refresh" />
    <template v-if="!loading && !error">
      <UEmpty v-if="!evidences?.length" title="このProjectにはまだEvidenceがありません" description="出典を選び、引用や要約を登録してください。" variant="subtle"><template #actions><UButton :to="{ name: 'evidence-create', params: { projectId } }" label="Evidenceを作成" /></template></UEmpty>
      <div v-else><p class="mb-4 text-sm text-muted">{{ evidences.length }}件のEvidence</p><ul class="space-y-6" aria-label="Evidence一覧">
        <UCard v-for="evidence in evidences" :key="evidence.id" as="li" class="min-w-0">
          <dl class="space-y-4 text-sm leading-7">
            <div><dt class="mb-2 font-semibold">引用</dt><dd><blockquote v-if="evidence.quote?.trim()" class="border-l-2 border-accented pl-4 whitespace-pre-wrap wrap-anywhere">{{ evidence.quote }}</blockquote><p v-else class="text-muted">引用は未登録</p></dd></div>
            <div><dt class="mb-2 font-semibold">要約</dt><dd class="whitespace-pre-wrap wrap-anywhere">{{ evidence.summary?.trim() ? evidence.summary : '要約は未登録' }}</dd></div>
            <div v-if="evidence.locator"><dt class="font-semibold">引用箇所</dt><dd class="whitespace-pre-wrap wrap-anywhere">{{ evidence.locator }}</dd></div>
            <div v-if="evidence.note"><dt class="font-semibold">メモ</dt><dd class="whitespace-pre-wrap wrap-anywhere">{{ evidence.note }}</dd></div>
          </dl>
          <template #footer><h2 class="mb-2 text-sm font-semibold">出典</h2><SourceDetails :source="evidence.source" /><p class="mt-3 text-xs text-muted">更新日 <time :datetime="evidence.updatedAt">{{ dates.format(new Date(evidence.updatedAt)) }}</time></p></template>
        </UCard>
      </ul></div>
    </template>
  </section>
</template>
