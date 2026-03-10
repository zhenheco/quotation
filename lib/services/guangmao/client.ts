import crypto from 'crypto'
import {
  GuangmaoConfig,
  GuangmaoResponse,
  GuangmaoInvoiceIssueData,
  GuangmaoInvoiceVoidData,
  GuangmaoAllowanceData,
  GuangmaoInvoiceResult,
} from './types'

const DEFAULT_BASE_URL = 'https://invoice-api.amego.tw/'
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1000

export class GuangmaoClient {
  private readonly config: GuangmaoConfig
  private readonly baseUrl: string

  constructor(config: GuangmaoConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL
  }

  /**
   * 生成 MD5 簽名
   * sign = MD5(jsonData + timestamp + APP_KEY)
   */
  private generateSignature(jsonData: string, timestamp: number): string {
    const rawString = jsonData + timestamp.toString() + this.config.appKey
    return crypto.createHash('md5').update(rawString).digest('hex')
  }

  /**
   * 發送請求到光貿 API（含重試）
   */
  async request<T>(endpoint: string, data: Record<string, unknown>): Promise<GuangmaoResponse<T>> {
    const jsonData = JSON.stringify(data)
    const timestamp = Math.floor(Date.now() / 1000)
    const sign = this.generateSignature(jsonData, timestamp)

    const params = new URLSearchParams()
    params.append('invoice', this.config.invoice)
    params.append('data', jsonData)
    params.append('time', timestamp.toString())
    params.append('sign', sign)

    const url = new URL(endpoint, this.baseUrl).toString()

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`)
        }

        return (await response.json()) as GuangmaoResponse<T>
      } catch (error) {
        lastError = error as Error
        // 不要 log appKey 或完整請求
        console.error(`Guangmao API [${endpoint}] attempt ${attempt + 1} failed:`, lastError.message)

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
        }
      }
    }

    throw lastError ?? new Error('Guangmao API request failed')
  }

  /** 開立發票（自動配號）*/
  async issueInvoice(data: GuangmaoInvoiceIssueData): Promise<GuangmaoResponse<GuangmaoInvoiceResult>> {
    return this.request<GuangmaoInvoiceResult>('json/f0401', data as unknown as Record<string, unknown>)
  }

  /** 作廢發票 */
  async voidInvoice(data: GuangmaoInvoiceVoidData): Promise<GuangmaoResponse<unknown>> {
    return this.request('json/f0501', data as unknown as Record<string, unknown>)
  }

  /** 開立折讓 */
  async issueAllowance(data: GuangmaoAllowanceData): Promise<GuangmaoResponse<unknown>> {
    return this.request('json/g0401', data as unknown as Record<string, unknown>)
  }

  /** 作廢折讓 */
  async voidAllowance(data: { AllowanceNumber: string; Reason: string }): Promise<GuangmaoResponse<unknown>> {
    return this.request('json/g0501', data as unknown as Record<string, unknown>)
  }
}
