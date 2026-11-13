import { ref, shallowRef, watch, type WatchSource } from 'vue'

// GETだけを中断する。POSTはuseCreationで画面離脱後の処理を抑止する。
export function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, dependencies: WatchSource[] = []) {
  const data = shallowRef<T | null>(null)
  const error = shallowRef<unknown>(null)
  const loading = ref(true)
  const reloadKey = ref(0)
  watch([...dependencies, reloadKey], async (_, __, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    data.value = null
    error.value = null
    loading.value = true
    try {
      const result = await load(controller.signal)
      if (!controller.signal.aborted) data.value = result
    } catch (cause) {
      if (!controller.signal.aborted) error.value = cause
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }, { immediate: true })
  return { data, error, loading, refresh: () => { reloadKey.value++ } }
}
