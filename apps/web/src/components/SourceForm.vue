<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { createSourceSchema, type CreateSourceData } from '@kari-fusen/schemas'
import type { FormSubmitEvent } from '@nuxt/ui'
import { createSource, type Source } from '@/api/sources'
import { useCreation } from '@/composables/useCreation'
import CreationFeedback from './CreationFeedback.vue'

const props = defineProps<{ redirect?: boolean }>()
const emit = defineEmits<{ created: [source: Source]; cancel: []; busy: [value: boolean] }>()
const state = reactive({ title: '', type: '', year: '', url: '' })
const formState = computed(() => ({
  title: state.title,
  type: state.type === '' ? null : state.type,
  year: String(state.year).trim() === '' ? null : Number(state.year),
  url: state.url.trim() === '' ? null : state.url.trim(),
}))
const task = useCreation(createSource, {
  title: 'Sourceを作成しました',
  destination: props.redirect ? () => ({ name: 'sources' }) : undefined,
  onCreated: (source) => emit('created', source),
})
const { submitting, created, error, navigationFailed } = task
watch(submitting, (value) => emit('busy', value), { flush: 'sync' })
function onSubmit(event: FormSubmitEvent<CreateSourceData>) { return task.submit(event.data) }
</script>

<template>
  <CreationFeedback :error="error" :created="!!created" :navigation-failed="navigationFailed" :destination="{ name: 'sources' }" />
  <UForm :schema="createSourceSchema" :state="formState" :disabled="submitting || !!created" :loading-auto="false" novalidate class="space-y-6" @submit="onSubmit">
    <UFormField name="title" label="タイトル" required><UInput v-model="state.title" class="w-full" required /></UFormField>
    <UFormField name="type" label="種別" hint="任意"><UInput v-model="state.type" placeholder="書籍、論文、Webページなど" class="w-full" /></UFormField>
    <UFormField name="year" label="年" hint="任意"><UInput v-model="state.year" inputmode="numeric" class="w-full" /></UFormField>
    <UFormField name="url" label="出典URL" hint="任意" description="http:// または https:// で始まるURL"><UInput v-model="state.url" type="url" class="w-full" /></UFormField>
    <div class="flex flex-wrap gap-3">
      <UButton type="submit" label="作成する" :loading="submitting" :disabled="submitting || !!created" />
      <UButton label="キャンセル" color="neutral" variant="outline" :disabled="submitting" @click="emit('cancel')" />
    </div>
  </UForm>
</template>
