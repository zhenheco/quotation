import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '404 - 頁面未找到',
  description: '您要查找的頁面不存在',
  robots: 'noindex, nofollow'
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-6xl font-extrabold text-gray-900">
            404
          </h1>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            頁面未找到
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            抱歉，您要查找的頁面不存在。
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/zh"
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </div>
  )
}