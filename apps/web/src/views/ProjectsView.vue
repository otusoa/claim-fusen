<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { listProjects, type Project } from '@/api/projects'

const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref(false)
const controller = new AbortController()
const dateFormat = new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' })

async function loadProjects() {
  loading.value = true
  error.value = false
  try {
    projects.value = await listProjects(controller.signal)
  } catch {
    if (!controller.signal.aborted) error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(loadProjects)
onUnmounted(() => controller.abort())
</script>

<template>
  <section aria-labelledby="projects-heading" :aria-busy="loading">
    <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="mb-2 text-sm font-medium text-primary">研究のワークスペース</p>
        <h1 id="projects-heading" class="text-3xl font-semibold tracking-tight">研究プロジェクト</h1>
        <p class="mt-3 text-sm leading-7 text-muted">研究テーマごとに、考察と根拠を整理します。</p>
      </div>
      <div class="flex flex-wrap gap-3">
        <UButton :to="{ name: 'project-create' }" label="Projectを作成" />
        <UButton
          label="再読み込み"
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="loading"
          @click="loadProjects"
        />
      </div>
    </div>

    <div v-if="loading" role="status" aria-live="polite">
      <span class="sr-only">プロジェクトを読み込んでいます</span>
      <div class="grid gap-4 sm:grid-cols-2" aria-hidden="true">
        <UCard v-for="item in 4" :key="item">
          <USkeleton class="h-6 w-3/4" />
          <USkeleton class="mt-4 h-4 w-full" />
          <USkeleton class="mt-2 h-4 w-2/3" />
        </UCard>
      </div>
    </div>

    <UAlert
      v-else-if="error"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      title="プロジェクトを取得できませんでした"
      description="しばらく待ってから、もう一度お試しください。"
    >
      <template #actions>
        <UButton label="もう一度試す" color="error" variant="outline" @click="loadProjects" />
      </template>
    </UAlert>

    <UEmpty
      v-else-if="projects.length === 0"
      icon="i-lucide-folder-open"
      title="プロジェクトはまだありません"
      description="研究テーマを登録して、考察と根拠を整理しましょう。"
      variant="subtle"
    >
      <template #actions>
        <UButton :to="{ name: 'project-create' }" label="Projectを作成" />
      </template>
    </UEmpty>

    <div v-else>
      <p class="mb-4 text-sm text-muted" role="status">{{ projects.length }}件のプロジェクト</p>
      <ul class="grid gap-4 sm:grid-cols-2" aria-label="研究プロジェクト一覧">
        <UCard v-for="project in projects" :key="project.id" as="li" class="min-w-0">
          <h2 class="text-lg font-semibold wrap-anywhere">{{ project.title }}</h2>
          <p v-if="project.description" class="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted wrap-anywhere">
            {{ project.description }}
          </p>
          <template #footer>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="text-xs text-muted">
                更新日 <time :datetime="project.updatedAt">{{ dateFormat.format(new Date(project.updatedAt)) }}</time>
              </p>
              <UButton
                :to="{ name: 'project-claims', params: { projectId: project.id } }"
                label="Claim一覧"
                :aria-label="`${project.title}のClaim一覧`"
                variant="soft"
                size="sm"
              />
            </div>
          </template>
        </UCard>
      </ul>
    </div>
  </section>
</template>
