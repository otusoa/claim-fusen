// API内のURLもそのままhrefへ渡さず、外部出典として開ける形式に限定する。
export function sourceUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
