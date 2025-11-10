export interface KVNamespace {
  get(key: string, options?: { type: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; expiration?: number; metadata?: Record<string, unknown> }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: Array<{ name: string; expiration?: number; metadata?: Record<string, unknown> }>; list_complete: boolean; cursor?: string }>
}

export class KVCache {
  constructor(private kv: KVNamespace) {}

  async getExchangeRates(currency: string, date: string): Promise<Record<string, number> | null> {
    const key = `rates:${currency}:${date}`
    try {
      const value = await this.kv.get(key, { type: 'json' })
      return value as Record<string, number> | null
    } catch (error) {
      console.error('KV get error:', error)
      return null
    }
  }

  async setExchangeRates(currency: string, date: string, rates: Record<string, number>): Promise<void> {
    const key = `rates:${currency}:${date}`
    try {
      await this.kv.put(key, JSON.stringify(rates), {
        expirationTtl: 86400,
      })
    } catch (error) {
      console.error('KV put error:', error)
    }
  }

  async getRateLimit(identifier: string): Promise<number> {
    const key = `ratelimit:${identifier}`
    try {
      const value = await this.kv.get(key, { type: 'text' })
      return value ? parseInt(value, 10) : 0
    } catch (error) {
      console.error('KV get rate limit error:', error)
      return 0
    }
  }

  async incrementRateLimit(identifier: string, ttl: number = 3600): Promise<number> {
    const key = `ratelimit:${identifier}`
    try {
      const current = await this.getRateLimit(identifier)
      const newValue = current + 1
      await this.kv.put(key, newValue.toString(), {
        expirationTtl: ttl,
      })
      return newValue
    } catch (error) {
      console.error('KV increment rate limit error:', error)
      return 0
    }
  }
}
