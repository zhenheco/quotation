import { ErrorResponses } from '@/lib/api/response-utils'

/**
 * 處理所有不存在的 API 路由
 * 使用動態路由 catch-all [...notfound] 來捕捉所有未匹配的 API 請求
 */
export async function GET() {
  return ErrorResponses.notFound('API endpoint')
}

export async function POST() {
  return ErrorResponses.notFound('API endpoint')
}

export async function PUT() {
  return ErrorResponses.notFound('API endpoint')
}

export async function PATCH() {
  return ErrorResponses.notFound('API endpoint')
}

export async function DELETE() {
  return ErrorResponses.notFound('API endpoint')
}

export async function HEAD() {
  return ErrorResponses.notFound('API endpoint')
}

export async function OPTIONS() {
  return ErrorResponses.notFound('API endpoint')
}
