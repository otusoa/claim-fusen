<script setup lang="ts">
import { useRouter } from 'vue-router'
import SourceForm from '@/components/SourceForm.vue'
const router = useRouter()
</script>

<template>
  <section aria-labelledby="source-create-heading" class="max-w-2xl">
    <h1 id="source-create-heading" class="mb-4 text-3xl font-semibold">Sourceを作成</h1>
    <p class="mb-8 text-sm leading-7 text-muted">出典はすべてのProjectで共有されます。作成後はSource一覧を開きます。</p>
    <SourceForm redirect @cancel="router.push({ name: 'sources' })" />
  </section>
</template>
