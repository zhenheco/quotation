'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  {
    en: 'Dashboard',
    zh: '儀表板',
    href: '/dashboard',
    icon: '🏠',
  },
  {
    en: 'Products',
    zh: '產品',
    href: '/products',
    icon: '📦',
  },
  {
    en: 'Customers',
    zh: '客戶',
    href: '/customers',
    icon: '👥',
  },
  {
    en: 'Quotations',
    zh: '報價單',
    href: '/quotations',
    icon: '📄',
  },
]

export default function Sidebar({ locale }: { locale: string }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-gray-200 min-h-screen p-4 transition-all duration-300 relative`}
    >
      {/* 收合按鈕 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 shadow-sm z-10 cursor-pointer"
        title={isCollapsed ? (locale === 'zh' ? '展開' : 'Expand') : (locale === 'zh' ? '收合' : 'Collapse')}
      >
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${
            isCollapsed ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const href = `/${locale}${item.href}`
          const isActive = pathname.startsWith(href)

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group relative ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title={isCollapsed ? (locale === 'en' ? item.en : item.zh) : ''}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <span className="whitespace-nowrap">
                  {locale === 'en' ? item.en : item.zh}
                </span>
              )}

              {/* 收合時的提示 */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {locale === 'en' ? item.en : item.zh}
                </div>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
