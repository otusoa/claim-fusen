<script setup lang="ts">
import { onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@nuxt/ui/composables/useToast'
import type { FormSubmitEvent } from '@nuxt/ui'
import { createProjectSchema, type CreateProjectData, type CreateProjectInput } from '@kari-fusen/schemas'
import { createProject, ProjectCreationError, type Project } from '@/api/projects'

const router = useRouter()
const toast = useToast()
const state = reactive({ title: '', description: '' } satisfies CreateProjectInput)
const submitting = ref(false)
const error = ref<'invalid' | 'failed' | null>(null)
const createdProject = ref<Project | null>(null)
const navigationFailed = ref(false)
let active = true

onUnmounted(() => { active = false })

async function onSubmit(event: FormSubmitEvent<CreateProjectData>) {
  // Enterや連続クリックでも、送信中・作成済みなら再登録しない。
  if (submitting.value || createdProject.value) return
  submitting.value = true
  error.value = null

  try {
    const project = await createProject(event.data)
    // POSTの中断は作成の取り消しにはならない。離脱後は画面操作だけ抑止する。
    if (!active) return
    createdProject.value = project
    toast.add({ title: 'Projectを作成しました', color: 'success' })

    // 作成と遷移の失敗を分け、遷移だけ失敗しても再POSTしない。
    try {
      const failure = await router.replace({ name: 'project-claims', params: { projectId: project.id } })
      if (active && failure) navigationFailed.value = true
    } catch {
      if (active) navigationFailed.value = true
    }
  } catch (cause) {
    if (!active) return
    error.value = cause instanceof ProjectCreationError && cause.status === 400 ? 'invalid' : 'failed'
  } finally {
    if (active) submitting.value = false
  }
}
</script>

<template>
  <section aria-labelledby="project-create-heading" :aria-busy="submitting" class="max-w-2xl">
    <UButton to="/projects" label="Project一覧へ戻る" color="neutral" variant="link" class="mb-6 px-0" :disabled="submitting" />

    <div class="mb-8">
      <p class="mb-2 text-sm font-medium text-primary">研究のワークスペース</p>
      <h1 id="project-create-heading" class="text-3xl font-semibold tracking-tight">Projectを作成</h1>
      <p class="mt-3 text-sm leading-7 text-muted">研究テーマのタイトルと説明を入力します。作成後は、そのProjectのClaim一覧を開きます。</p>
    </div>

    <UAlert
      v-if="error"
      role="alert"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="error === 'invalid' ? '入力内容を確認してください' : 'Projectを作成できませんでした'"
      :description="error === 'invalid'
        ? 'タイトルなどの入力内容を確認して、もう一度作成してください。'
        : '入力内容は保持しています。通信が途切れた場合は、再送する前にProject一覧で作成済みか確認してください。'"
      class="mb-6"
    />

    <UAlert
      v-if="createdProject"
      role="status"
      :color="navigationFailed ? 'warning' : 'success'"
      variant="subtle"
      title="Projectは作成済みです"
      :description="navigationFailed ? 'Claim一覧へ移動できませんでした。次のリンクから開いてください。' : '作成したProjectのClaim一覧へ移動しています。'"
      class="mb-6"
    >
      <template v-if="navigationFailed" #actions>
        <UButton
          :to="{ name: 'project-claims', params: { projectId: createdProject.id } }"
          label="作成したProjectを開く"
          color="neutral"
          variant="outline"
        />
      </template>
    </UAlert>

    <UForm
      :schema="createProjectSchema"
      :state="state"
      :disabled="submitting || !!createdProject"
      :loading-auto="false"
      novalidate
      class="space-y-6"
      @submit="onSubmit"
    >
      <UFormField name="title" label="タイトル" required>
        <UInput v-model="state.title" class="w-full" required />
      </UFormField>
      <UFormField name="description" label="説明" hint="任意" description="研究の目的や扱いたい内容を記入できます。">
        <UTextarea v-model="state.description" :rows="5" autoresize :maxrows="12" class="w-full" />
      </UFormField>

      <div class="flex flex-wrap gap-3">
        <UButton type="submit" label="作成する" :loading="submitting" :disabled="submitting || !!createdProject" />
        <UButton to="/projects" label="キャンセル" color="neutral" variant="outline" :disabled="submitting" />
      </div>
    </UForm>
  </section>
</template>
