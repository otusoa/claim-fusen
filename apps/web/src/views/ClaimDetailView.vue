<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ClaimEvidenceType, ClaimStatus } from '@kari-fusen/schemas'
import { ClaimsRequestError, getClaim, type ClaimDetail } from '@/api/claims'
import { sourceUrl } from '@/utils/source-url'

const props = defineProps<{ claimId: string }>()
const claim = ref<ClaimDetail | null>(null)
const loading = ref(true)
const error = ref<'invalid' | 'not-found' | 'failed' | null>(null)
const reloadKey = ref(0)
const dateFormat = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' })
const statusLabels: Record<ClaimStatus, string> = {
  draft: '下書き',
  active: '進行中',
  archived: 'アーカイブ',
}
const relationLabels: Record<ClaimEvidenceType, string> = {
  supports: '支持',
  challenges: '反証・異議',
  contextualizes: '文脈の補足',
  corresponds: '対応',
}
const relations = computed(() => claim.value?.claimEvidences.map((relation) => ({
  ...relation,
  sourceUrl: sourceUrl(relation.evidence.source.url),
})) ?? [])

watch([() => props.claimId, reloadKey], async ([claimId], _, onCleanup) => {
  const controller = new AbortController()
  // IDの変更・画面離脱後に、古いリクエストの結果で上書きしない。
  onCleanup(() => controller.abort())
  loading.value = true
  error.value = null
  claim.value = null

  try {
    const result = await getClaim(claimId, controller.signal)
    if (!controller.signal.aborted) claim.value = result
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
  <section aria-labelledby="claim-heading" :aria-busy="loading">
    <UButton
      v-if="claim"
      :to="{ name: 'project-claims', params: { projectId: claim.projectId } }"
      label="所属ProjectのClaim一覧へ戻る"
      color="neutral"
      variant="link"
      class="mb-6 px-0"
    />
    <UButton v-else to="/projects" label="Project一覧へ戻る" color="neutral" variant="link" class="mb-6 px-0" />

    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0 flex-1">
        <p class="mb-2 text-sm font-medium text-primary">Claim詳細</p>
        <h1 id="claim-heading" class="text-3xl font-semibold tracking-tight wrap-anywhere">
          {{ claim?.title ?? 'Claim詳細' }}
        </h1>
        <div v-if="claim" class="mt-4 flex flex-wrap items-center gap-3">
          <UBadge color="neutral" variant="subtle" :label="statusLabels[claim.status]" />
          <p class="text-xs text-muted">
            更新日 <time :datetime="claim.updatedAt">{{ dateFormat.format(new Date(claim.updatedAt)) }}</time>
          </p>
        </div>
      </div>
      <UButton
        label="再読み込み"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="reloadKey++"
      />
    </div>

    <div v-if="loading" role="status" aria-live="polite">
      <span class="sr-only">Claim詳細を読み込んでいます</span>
      <div class="space-y-6" aria-hidden="true">
        <USkeleton class="h-32 w-full" />
        <USkeleton class="h-64 w-full" />
      </div>
    </div>

    <UEmpty
      v-else-if="error === 'invalid' || error === 'not-found'"
      icon="i-lucide-file-question-mark"
      :title="error === 'invalid' ? 'ClaimのURLが正しくありません' : 'Claimが見つかりません'"
      description="URLを確認するか、Project一覧から選び直してください。"
      variant="subtle"
    />

    <UAlert
      v-else-if="error"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="Claim詳細を取得できませんでした"
      description="しばらく待ってから、もう一度お試しください。"
    >
      <template #actions>
        <UButton label="もう一度試す" color="error" variant="outline" @click="reloadKey++" />
      </template>
    </UAlert>

    <div v-else-if="claim" class="space-y-10">
      <section aria-labelledby="claim-body-heading">
        <h2 id="claim-body-heading" class="mb-4 text-xl font-semibold">本文</h2>
        <p v-if="claim.body?.trim()" class="whitespace-pre-wrap leading-8 wrap-anywhere">{{ claim.body }}</p>
        <p v-else class="text-sm text-muted">本文は未登録</p>
      </section>

      <section aria-labelledby="claim-evidences-heading">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <h2 id="claim-evidences-heading" class="text-xl font-semibold">関連するEvidence</h2>
          <span class="text-sm text-muted">{{ relations.length }}件</span>
        </div>
        <UEmpty
          v-if="relations.length === 0"
          icon="i-lucide-notebook-pen"
          title="関連するEvidenceはありません"
          description="Evidenceが関連付けられると、引用・要約・出典がここに表示されます。"
          variant="subtle"
        />
        <ul v-else class="space-y-6" aria-label="関連するEvidence">
          <UCard v-for="relation in relations" :key="relation.id" as="li" class="min-w-0">
            <template #header>
              <h3 class="flex flex-wrap items-center gap-2">
                <UBadge color="neutral" variant="subtle" :label="relationLabels[relation.type]" />
                <span class="text-sm text-muted">{{ relation.type }}</span>
              </h3>
              <p v-if="relation.note?.trim()" class="mt-3 whitespace-pre-wrap text-sm leading-7 wrap-anywhere">
                <span class="font-medium">関係の補足：</span>{{ relation.note }}
              </p>
            </template>

            <dl class="space-y-5 text-sm leading-7">
              <div>
                <dt class="mb-2 font-semibold">引用</dt>
                <dd>
                  <blockquote v-if="relation.evidence.quote?.trim()" class="border-l-2 border-accented pl-4 whitespace-pre-wrap wrap-anywhere">{{ relation.evidence.quote }}</blockquote>
                  <p v-else class="text-muted">引用は未登録</p>
                </dd>
              </div>
              <div>
                <dt class="mb-2 font-semibold">要約</dt>
                <dd class="whitespace-pre-wrap wrap-anywhere" :class="{ 'text-muted': !relation.evidence.summary?.trim() }">{{ relation.evidence.summary?.trim() ? relation.evidence.summary : '要約は未登録' }}</dd>
              </div>
              <div v-if="relation.evidence.locator?.trim()">
                <dt class="mb-2 font-semibold">引用箇所</dt>
                <dd class="whitespace-pre-wrap wrap-anywhere">{{ relation.evidence.locator }}</dd>
              </div>
              <div v-if="relation.evidence.note?.trim()">
                <dt class="mb-2 font-semibold">Evidenceのメモ</dt>
                <dd class="whitespace-pre-wrap wrap-anywhere">{{ relation.evidence.note }}</dd>
              </div>
            </dl>

            <template #footer>
              <div class="space-y-2 text-sm leading-7">
                <h4 class="font-semibold">出典</h4>
                <p class="font-medium wrap-anywhere">{{ relation.evidence.source.title }}</p>
                <dl class="flex flex-wrap gap-x-6 gap-y-2 text-muted">
                  <div v-if="relation.evidence.source.type?.trim()" class="flex gap-2">
                    <dt class="shrink-0">種別</dt>
                    <dd class="wrap-anywhere">{{ relation.evidence.source.type }}</dd>
                  </div>
                  <div v-if="relation.evidence.source.year !== null" class="flex gap-2">
                    <dt>年</dt>
                    <dd>{{ relation.evidence.source.year }}</dd>
                  </div>
                </dl>
                <a
                  v-if="relation.sourceUrl"
                  :href="relation.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block text-primary underline underline-offset-4 wrap-anywhere focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >{{ relation.sourceUrl }}<span class="sr-only">（別タブで開きます）</span></a>
                <p v-else-if="relation.evidence.source.url" class="text-muted whitespace-pre-wrap wrap-anywhere">{{ relation.evidence.source.url }}</p>
              </div>
            </template>
          </UCard>
        </ul>
      </section>
    </div>
  </section>
</template>
