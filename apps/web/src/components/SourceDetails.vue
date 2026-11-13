<script setup lang="ts">
import { computed } from 'vue'
import type { Source } from '@/api/sources'
import { sourceUrl } from '@/utils/source-url'
const props = defineProps<{ source: Source }>()
const link = computed(() => sourceUrl(props.source.url))
</script>

<template>
  <div class="space-y-2 text-sm leading-7">
    <p class="font-semibold wrap-anywhere">{{ source.title }}</p>
    <dl class="flex flex-wrap gap-x-6 gap-y-2 text-muted">
      <div v-if="source.type" class="flex gap-2"><dt class="shrink-0">種別</dt><dd class="wrap-anywhere">{{ source.type }}</dd></div>
      <div v-if="source.year !== null" class="flex gap-2"><dt>年</dt><dd>{{ source.year }}</dd></div>
    </dl>
    <a v-if="link" :href="link" target="_blank" rel="noopener noreferrer" class="block text-primary underline underline-offset-4 wrap-anywhere focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{{ link }}<span class="sr-only">（別タブで開きます）</span></a>
    <p v-else-if="source.url" class="text-muted wrap-anywhere">{{ source.url }}</p>
  </div>
</template>
