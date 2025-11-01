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
    zh: '服務/項目',
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
    submenu: [
      {
        en: 'All Quotations',
        zh: '所有報價單',
        href: '/quotations',
      },
      {
        en: 'Payments',
        zh: '收款管理',
        href: '/payments',
      },
    ],
  },
  {
    en: 'Settings',
    zh: '系統設定',
    href: '/settings',
    icon: '⚙️',
  },
]

export default function Sidebar({ locale }: { locale: string }) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/quotations'])

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-white border-r border-gray-200 h-full min-h-screen p-4 transition-all duration-300 relative flex flex-col overflow-y-auto`}
    >
      {/* Header */}
      <div className="mb-8 pb-4 border-b border-gray-200">
        {isCollapsed ? (
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md">
              Q
            </div>
          </div>
        ) : (
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:shadow-lg transition-shadow">
              Q
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                {locale === 'zh' ? '報價系統' : 'Quotation'}
              </span>
              <span className="text-xs text-gray-500">
                {locale === 'zh' ? '管理平台' : 'Management'}
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* 收合按鈕 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-8 bg-white border border-gray-200 rounded-full p-1 hover:bg-gray-50 shadow-sm z-50 cursor-pointer"
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

      <nav className="space-y-2 flex-1">
        {menuItems.map((item) => {
          const href = `/${locale}${item.href}`
          const isActive = pathname.startsWith(href)
          const hasSubmenu = item.submenu && item.submenu.length > 0
          const isExpanded = expandedMenus.includes(item.href)

          return (
            <div key={item.href}>
              {hasSubmenu ? (
                <button
                  onClick={() => {
                    if (!isCollapsed) {
                      setExpandedMenus(prev =>
                        prev.includes(item.href)
                          ? prev.filter(h => h !== item.href)
                          : [...prev, item.href]
                      )
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group relative ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  title={isCollapsed ? (locale === 'en' ? item.en : item.zh) : ''}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="whitespace-nowrap flex-1 text-left">
                        {locale === 'en' ? item.en : item.zh}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}

                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {locale === 'en' ? item.en : item.zh}
                    </div>
                  )}
                </button>
              ) : (
                <Link
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

                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                      {locale === 'en' ? item.en : item.zh}
                    </div>
                  )}
                </Link>
              )}

              {hasSubmenu && isExpanded && !isCollapsed && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.submenu?.map((subItem) => {
                    const subHref = `/${locale}${subItem.href}`
                    const isSubActive = pathname === subHref

                    return (
                      <Link
                        key={subItem.href}
                        href={subHref}
                        className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                          isSubActive
                            ? 'bg-indigo-100 text-indigo-700 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {locale === 'en' ? subItem.en : subItem.zh}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
