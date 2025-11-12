/**
 * 觀測系統環境配置
 */

export type Environment = 'development' | 'staging' | 'production';

export interface ObservabilityConfig {
  environment: Environment;
  minLogLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  enablePIIRedaction: boolean;
  enableErrorSampling: boolean;
  maxErrorsPerMinute: number;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  enableRetry: boolean;
  maxRetries: number;
  enableAnalytics: boolean;
  logRetentionDays: number;
}

const DEFAULT_CONFIG: Record<Environment, ObservabilityConfig> = {
  development: {
    environment: 'development',
    minLogLevel: 'debug',
    enablePIIRedaction: false,
    enableErrorSampling: false,
    maxErrorsPerMinute: 1000,
    enableCircuitBreaker: false,
    circuitBreakerThreshold: 10,
    enableRetry: true,
    maxRetries: 2,
    enableAnalytics: false,
    logRetentionDays: 3,
  },
  staging: {
    environment: 'staging',
    minLogLevel: 'info',
    enablePIIRedaction: true,
    enableErrorSampling: true,
    maxErrorsPerMinute: 200,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    enableRetry: true,
    maxRetries: 3,
    enableAnalytics: true,
    logRetentionDays: 7,
  },
  production: {
    environment: 'production',
    minLogLevel: 'info',
    enablePIIRedaction: true,
    enableErrorSampling: true,
    maxErrorsPerMinute: 100,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    enableRetry: true,
    maxRetries: 3,
    enableAnalytics: true,
    logRetentionDays: 14,
  },
};

/**
 * 取得環境配置
 */
export function getObservabilityConfig(env?: string): ObservabilityConfig {
  const environment = (env || process.env.ENVIRONMENT || 'production') as Environment;
  return DEFAULT_CONFIG[environment] || DEFAULT_CONFIG.production;
}

/**
 * 取得當前環境
 */
export function getCurrentEnvironment(): Environment {
  return (process.env.ENVIRONMENT || 'production') as Environment;
}

/**
 * 檢查是否為生產環境
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === 'production';
}

/**
 * 檢查是否為開發環境
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === 'development';
}
