<script setup lang="ts">
import { listSources } from '@/api/sources'
import { useLoad } from '@/composables/useLoad'
import SourceDetails from '@/components/SourceDetails.vue'
const { data: sources, loading, error, refresh } = useLoad(listSources)
const dates = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' })
</script>

<template>
  <section aria-labelledby="sources-heading" :aria-busy="loading">
    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div><h1 id="sources-heading" class="text-3xl font-semibold">Source一覧</h1><p class="mt-3 text-sm text-muted">すべてのProjectで共有する出典です。</p></div>
      <div class="flex flex-wrap gap-3"><UButton :to="{ name: 'source-create' }" label="Sourceを作成" /><UButton label="再読み込み" color="neutral" variant="outline" :loading="loading" @click="refresh" /></div>
    </div>
    <div v-if="loading" role="status"><span class="sr-only">Sourceを読み込んでいます</span><USkeleton class="h-40 w-full" /></div>
    <UAlert v-else-if="error" role="alert" color="error" title="Source一覧を取得できませんでした" variant="subtle"><template #actions><UButton label="もう一度試す" color="error" variant="outline" @click="refresh" /></template></UAlert>
    <UEmpty v-else-if="!sources?.length" title="Sourceはまだありません" description="引用に使う出典を登録してください。" variant="subtle"><template #actions><UButton :to="{ name: 'source-create' }" label="Sourceを作成" /></template></UEmpty>
    <div v-else><p class="mb-4 text-sm text-muted">{{ sources.length }}件のSource</p><ul class="space-y-4" aria-label="Source一覧">
      <UCard v-for="source in sources" :key="source.id" as="li" class="min-w-0"><SourceDetails :source="source" /><template #footer><p class="text-xs text-muted">更新日 <time :datetime="source.updatedAt">{{ dates.format(new Date(source.updatedAt)) }}</time></p></template></UCard>
    </ul></div>
  </section>
</template>
