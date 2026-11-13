<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ja } from '@nuxt/ui/locale'
</script>

<template>
  <UApp :locale="ja">
    <div class="min-h-dvh bg-default text-default">
      <header class="border-b border-default">
        <div class="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5 sm:px-6">
          <span class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <UIcon name="i-lucide-notebook-pen" class="size-5" />
          </span>
          <RouterLink to="/projects" class="text-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            claim-fusen
          </RouterLink>
          <nav aria-label="メインナビゲーション" class="ml-auto flex flex-wrap gap-2">
            <UButton to="/projects" label="Project" color="neutral" variant="ghost" />
            <UButton to="/sources" label="Source" color="neutral" variant="ghost" />
          </nav>
        </div>
      </header>
      <main class="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <RouterView />
      </main>
    </div>
  </UApp>
</template>
