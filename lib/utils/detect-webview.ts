export function isWebView(): boolean {
  if (typeof window === 'undefined') return false

  const ua = navigator.userAgent.toLowerCase()

  const patterns = [
    // Meta 系列
    'line',
    'fbav',
    'fban',
    'instagram',
    'messenger',
    'barcelona', // Threads
    // 中國系
    'wechat',
    'micromessenger',
    'weibo',
    // TikTok
    'tiktok',
    'musical_ly',
    'bytedance',
    // 其他社交 App
    'twitter',
    'telegram',
    'kakaotalk',
    'snapchat',
    'pinterest',
    'linkedin',
    'redditapp',
  ]

  return patterns.some((p) => ua.includes(p))
}
