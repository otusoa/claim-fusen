<script setup lang="ts">
import { ref, watch } from 'vue'
import { ClaimsRequestError, listClaims, type Claim } from '@/api/claims'
import { listProjects, type Project } from '@/api/projects'
import type { ClaimStatus } from '@kari-fusen/schemas'

const props = defineProps<{ projectId: string }>()
const project = ref<Project | null>(null)
const claims = ref<Claim[]>([])
const loading = ref(true)
const error = ref<'invalid' | 'not-found' | 'failed' | null>(null)
const reloadKey = ref(0)
const dateFormat = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' })
const statusLabels: Record<ClaimStatus, string> = {
  draft: '下書き',
  active: '進行中',
  archived: 'アーカイブ',
}

watch([() => props.projectId, reloadKey], async ([projectId], _, onCleanup) => {
  const controller = new AbortController()
  // 同じ画面でProject IDが変わった場合も、古い取得結果を表示しない。
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = null
  project.value = null
  claims.value = []

  try {
    const [projects, projectClaims] = await Promise.all([
      listProjects(controller.signal),
      listClaims(projectId, controller.signal),
    ])
    if (controller.signal.aborted) return
    project.value = projects.find((item) => item.id.toLowerCase() === projectId.toLowerCase()) ?? null
    if (!project.value) {
      error.value = 'not-found'
      return
    }
    claims.value = projectClaims
  } catch (cause) {
    if (controller.signal.aborted) return
    if (cause instanceof ClaimsRequestError && cause.status === 400) error.value = 'invalid'
    else if (cause instanceof ClaimsRequestError && cause.status === 404) error.value = 'not-found'
    else error.value = 'failed'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })
</script>

<template>
  <section aria-labelledby="claims-heading" :aria-busy="loading">
    <UButton to="/projects" label="Project一覧へ戻る" color="neutral" variant="link" class="mb-6 px-0" />

    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="mb-2 text-sm font-medium text-primary wrap-anywhere">{{ project?.title ?? '研究プロジェクト' }}</p>
        <h1 id="claims-heading" class="text-3xl font-semibold tracking-tight">Claim一覧</h1>
        <p class="mt-3 text-sm leading-7 text-muted">このプロジェクトの主張・仮説・解釈を確認します。</p>
      </div>
      <UButton label="再読み込み" icon="i-lucide-refresh-cw" color="neutral" variant="outline" :loading="loading"
        @click="reloadKey++" />
    </div>

    <div v-if="loading" role="status" aria-live="polite">
      <span class="sr-only">Claimを読み込んでいます</span>
      <div class="space-y-4" aria-hidden="true">
        <UCard v-for="item in 3" :key="item">
          <USkeleton class="h-6 w-3/4" />
          <USkeleton class="mt-4 h-4 w-full" />
        </UCard>
      </div>
    </div>

    <UEmpty v-else-if="error === 'invalid' || error === 'not-found'" icon="i-lucide-folder-open"
      :title="error === 'invalid' ? 'ProjectのURLが正しくありません' : 'プロジェクトが見つかりません'"
      description="URLを確認するか、Project一覧から選び直してください。" variant="subtle" />

    <UAlert v-else-if="error" role="alert" color="error" variant="subtle" icon="i-lucide-circle-alert"
      title="Claim一覧を取得できませんでした" description="しばらく待ってから、もう一度お試しください。">
      <template #actions>
        <UButton label="もう一度試す" color="error" variant="outline" @click="reloadKey++" />
      </template>
    </UAlert>

    <UEmpty v-else-if="claims.length === 0" icon="i-lucide-notebook-pen" title="このProjectにはまだClaimがありません"
      description="登録された主張・仮説・解釈がここに表示されます。" variant="subtle" />

    <div v-else>
      <p class="mb-4 text-sm text-muted" role="status">{{ claims.length }}件のClaim</p>
      <ul class="space-y-4" aria-label="Claim一覧">
        <UCard v-for="claim in claims" :key="claim.id" as="li">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <h2 class="min-w-0 flex-1 text-lg font-semibold wrap-anywhere">{{ claim.title }}</h2>
            <UBadge color="neutral" variant="subtle" :label="statusLabels[claim.status]" />
          </div>
          <p v-if="claim.body" class="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-muted wrap-anywhere">
            {{ claim.body }}
          </p>
          <template #footer>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-muted">
                更新日 <time :datetime="claim.updatedAt">{{ dateFormat.format(new Date(claim.updatedAt)) }}</time>
              </p>
              <UButton :to="{ name: 'claim-detail', params: { claimId: claim.id } }" label="詳細を見る"
                :aria-label="`${claim.title}の詳細を見る`" variant="soft" />
            </div>
          </template>
        </UCard>
      </ul>
    </div>
  </section>
</template>
