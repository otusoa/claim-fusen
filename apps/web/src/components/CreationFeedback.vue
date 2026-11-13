<script setup lang="ts">
import { ApiRequestError } from '@/api/http'
import type { RouteLocationRaw } from 'vue-router'
defineProps<{ error: unknown; created: boolean; navigationFailed: boolean; destination?: RouteLocationRaw }>()
</script>

<template>
  <UAlert v-if="error" role="alert" color="error" variant="subtle" class="mb-6"
    :title="error instanceof ApiRequestError && error.status === 400 ? '入力内容を確認してください' : '登録できませんでした'"
    description="入力内容は保持しています。通信が途切れた場合は、再送前に一覧で登録済みか確認してください。" />
  <UAlert v-if="created && navigationFailed" role="status" color="warning" variant="subtle" class="mb-6"
    title="登録は完了しています" description="画面を移動できませんでした。登録し直さず、次のリンクから開いてください。">
    <template v-if="destination" #actions>
      <UButton :to="destination" label="登録した内容を開く" color="neutral" variant="outline" />
    </template>
  </UAlert>
</template>
