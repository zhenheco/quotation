import { ErrorResponses } from '@/lib/api/response-utils'

/**
 * API 404 處理
 * 當 API 路由不存在時返回統一的錯誤格式
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
