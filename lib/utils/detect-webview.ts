export function isWebView(): boolean {
  if (typeof window === 'undefined') return false

  const ua = navigator.userAgent.toLowerCase()

  const patterns = [
    'line',
    'fbav',
    'fban',
    'instagram',
    'messenger',
    'wechat',
    'micromessenger',
    'weibo',
  ]

  return patterns.some((p) => ua.includes(p))
}
