/**
 * Cloudflare AI Gateway 整合
 * 參考 Auto-pilot-SEO 的認證模式
 */

type GatewayProvider =
  | 'openai'
  | 'google-ai-studio'
  | 'anthropic'
  | 'groq'
  | 'mistral'
  | 'cohere'
  | 'deepseek'
  | 'perplexity-ai'
  | 'openrouter'

interface GatewayConfig {
  accountId: string
  gatewayId: string
  token: string
  enabled: boolean
}

function getGatewayConfig(): GatewayConfig {
  return {
    accountId: process.env.CF_AI_GATEWAY_ACCOUNT_ID || '',
    gatewayId: process.env.CF_AI_GATEWAY_ID || '',
    token: process.env.CF_AI_GATEWAY_TOKEN || '',
    enabled: process.env.CF_AI_GATEWAY_ENABLED === 'true',
  }
}

export function isGatewayEnabled(): boolean {
  const config = getGatewayConfig()
  return config.enabled && !!config.accountId && !!config.gatewayId
}

export function getGatewayBaseUrl(provider: GatewayProvider): string {
  const config = getGatewayConfig()
  return `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/${provider}`
}

export function getGatewayToken(): string {
  return getGatewayConfig().token
}

export function getGatewayHeaders(): Record<string, string> {
  const token = getGatewayToken()
  if (!token) return {}
  return {
    'cf-aig-authorization': `Bearer ${token}`,
  }
}

export function getOpenRouterBaseUrl(): string {
  if (isGatewayEnabled()) {
    return getGatewayBaseUrl('openrouter')
  }
  return 'https://openrouter.ai/api/v1'
}

/**
 * 建立 OpenRouter 請求 headers
 * Gateway BYOK 模式：只需要 cf-aig-authorization，Gateway 會使用存儲的 API Key
 * 非 Gateway 模式：需要 Authorization header
 */
export function buildOpenRouterHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // 非 Gateway 模式需要 API key
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  // Gateway 模式加入認證 header
  if (isGatewayEnabled()) {
    Object.assign(headers, getGatewayHeaders())
  }

  return headers
}
