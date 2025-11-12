/**
 * Circuit Breaker 模式
 * 用於 D1 寫入失敗時的容錯機制
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private options: CircuitBreakerOptions;

  constructor(options?: Partial<CircuitBreakerOptions>) {
    this.options = {
      failureThreshold: options?.failureThreshold || 5,
      successThreshold: options?.successThreshold || 2,
      timeout: options?.timeout || 60000,
    };
  }

  /**
   * 執行函式，帶有 Circuit Breaker 保護
   */
  async execute<T>(fn: () => Promise<T>): Promise<T | null> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        return null;
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * 成功時的處理
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
      }
    }
  }

  /**
   * 失敗時的處理
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.timeout;
    }
  }

  /**
   * 取得當前狀態
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * 重置 Circuit Breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  /**
   * 檢查是否開啟（不允許請求通過）
   */
  isOpen(): boolean {
    return this.state === 'OPEN' && Date.now() < this.nextAttempt;
  }
}

/**
 * 指數退避重試
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries || 3;
  const initialDelay = options?.initialDelay || 1000;
  const maxDelay = options?.maxDelay || 10000;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          maxDelay
        );
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Sleep 函式
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
