<script setup lang="ts">
import { ApiRequestError } from '@/api/http'
defineProps<{ loading: boolean; error: unknown }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div v-if="loading" role="status"><span class="sr-only">Projectを確認しています</span><USkeleton class="h-32 w-full" /></div>
  <UEmpty v-else-if="error instanceof ApiRequestError && (error.status === 400 || error.status === 404)"
    :title="error.status === 400 ? 'ProjectのURLが正しくありません' : 'Projectが見つかりません'"
    description="Project一覧から選び直してください。" variant="subtle"><template #actions><UButton to="/projects" label="Project一覧へ戻る" /></template></UEmpty>
  <UAlert v-else-if="error" role="alert" color="error" variant="subtle" title="Projectを取得できませんでした"><template #actions><UButton label="もう一度試す" color="error" variant="outline" @click="emit('retry')" /></template></UAlert>
</template>
