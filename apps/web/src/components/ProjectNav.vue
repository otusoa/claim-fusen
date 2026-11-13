<script setup lang="ts">
defineProps<{ projectId: string }>()
</script>

<template>
  <nav aria-label="Project内のナビゲーション" class="mb-6 flex flex-wrap gap-2">
    <UButton :to="{ name: 'project-claims', params: { projectId } }" label="Claim一覧" color="neutral" variant="ghost" active-variant="soft" />
    <UButton :to="{ name: 'project-evidences', params: { projectId } }" label="Evidence一覧" color="neutral" variant="ghost" active-variant="soft" />
  </nav>
</template>
