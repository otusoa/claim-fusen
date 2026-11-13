import { onScopeDispose, ref, shallowRef, watch, type WatchSource } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { useToast } from '@nuxt/ui/composables/useToast'

export function useCreation<TInput, TResult>(save: (input: TInput) => Promise<TResult>, options: {
  title: string
  destination?: (result: TResult) => RouteLocationRaw
  onCreated?: (result: TResult) => void
  scope?: WatchSource
}) {
  const router = useRouter()
  const toast = useToast()
  const submitting = ref(false)
  const created = shallowRef<TResult | null>(null)
  const error = shallowRef<unknown>(null)
  const navigationFailed = ref(false)
  let generation = 0
  let active = true
  if (options.scope) watch(options.scope, () => {
    generation++
    submitting.value = false
    created.value = null
    error.value = null
    navigationFailed.value = false
  }, { flush: 'sync' })
  onScopeDispose(() => { active = false; generation++ })

  async function submit(input: TInput) {
    if (submitting.value || created.value) return
    const currentGeneration = generation
    const current = () => active && generation === currentGeneration
    submitting.value = true
    error.value = null
    try {
      const result = await save(input)
      if (!current()) return
      created.value = result
      toast.add({ title: options.title, color: 'success' })
      options.onCreated?.(result)
      if (options.destination && current()) {
        try {
          const failure = await router.replace(options.destination(result))
          if (current() && failure) navigationFailed.value = true
        } catch {
          if (current()) navigationFailed.value = true
        }
      }
    } catch (cause) {
      if (current()) error.value = cause
    } finally {
      if (current()) submitting.value = false
    }
  }
  return { submitting, created, error, navigationFailed, submit }
}
