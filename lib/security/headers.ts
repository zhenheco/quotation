/**
 * 安全 Headers 配置
 *
 * 提供 CSP、HSTS、X-Frame-Options 等安全 headers
 * 符合 OWASP 安全最佳實踐
 */

import { NextResponse } from 'next/server'

export interface SecurityHeadersConfig {
  enableCSP?: boolean
  enableHSTS?: boolean
  enableFrameOptions?: boolean
  enableContentTypeOptions?: boolean
  enableXSSProtection?: boolean
  enableReferrerPolicy?: boolean
  enablePermissionsPolicy?: boolean
}

/**
 * Content Security Policy (CSP)
 *
 * 防止 XSS、數據注入等攻擊
 */
function getCSPHeader(): string {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js 需要 unsafe-eval 和 unsafe-inline
    "style-src 'self' 'unsafe-inline'", // Tailwind CSS 需要 unsafe-inline
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.brevo.com https://v6.exchangerate-api.com https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests"
  ]

  return cspDirectives.join('; ')
}

/**
 * HTTP Strict Transport Security (HSTS)
 *
 * 強制使用 HTTPS
 */
function getHSTSHeader(): string {
  // max-age=31536000 (1 year), includeSubDomains, preload
  return 'max-age=31536000; includeSubDomains; preload'
}

/**
 * X-Frame-Options
 *
 * 防止 Clickjacking 攻擊
 */
function getFrameOptionsHeader(): string {
  return 'DENY' // 完全禁止在 iframe 中顯示
}

/**
 * X-Content-Type-Options
 *
 * 防止 MIME 類型嗅探
 */
function getContentTypeOptionsHeader(): string {
  return 'nosniff'
}

/**
 * X-XSS-Protection
 *
 * 啟用瀏覽器內建 XSS 保護（舊版瀏覽器）
 */
function getXSSProtectionHeader(): string {
  return '1; mode=block'
}

/**
 * Referrer-Policy
 *
 * 控制 Referer header 的發送
 */
function getReferrerPolicyHeader(): string {
  return 'strict-origin-when-cross-origin'
}

/**
 * Permissions-Policy (Feature-Policy 的新版本)
 *
 * 控制瀏覽器功能的使用權限
 */
function getPermissionsPolicyHeader(): string {
  const policies = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()' // 禁用 FLoC（Google Privacy Sandbox）
  ]

  return policies.join(', ')
}

/**
 * 為 NextResponse 添加所有安全 headers
 */
export function addSecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  const {
    enableCSP = true,
    enableHSTS = true,
    enableFrameOptions = true,
    enableContentTypeOptions = true,
    enableXSSProtection = true,
    enableReferrerPolicy = true,
    enablePermissionsPolicy = true,
  } = config

  // 只在生產環境啟用 HSTS
  const isProduction = process.env.NODE_ENV === 'production'

  if (enableCSP) {
    response.headers.set('Content-Security-Policy', getCSPHeader())
  }

  if (enableHSTS && isProduction) {
    response.headers.set('Strict-Transport-Security', getHSTSHeader())
  }

  if (enableFrameOptions) {
    response.headers.set('X-Frame-Options', getFrameOptionsHeader())
  }

  if (enableContentTypeOptions) {
    response.headers.set('X-Content-Type-Options', getContentTypeOptionsHeader())
  }

  if (enableXSSProtection) {
    response.headers.set('X-XSS-Protection', getXSSProtectionHeader())
  }

  if (enableReferrerPolicy) {
    response.headers.set('Referrer-Policy', getReferrerPolicyHeader())
  }

  if (enablePermissionsPolicy) {
    response.headers.set('Permissions-Policy', getPermissionsPolicyHeader())
  }

  return response
}

/**
 * 安全 headers middleware
 */
export function securityHeadersMiddleware(
  response: NextResponse,
  config?: SecurityHeadersConfig
): NextResponse {
  return addSecurityHeaders(response, config)
}
