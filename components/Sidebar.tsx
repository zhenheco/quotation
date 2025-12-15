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
    en: 'Suppliers',
    zh: '供應商',
    href: '/suppliers',
    icon: '🏭',
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
    en: 'Accounting',
    zh: '會計系統',
    href: '/accounting',
    icon: '📊',
    submenu: [
      {
        en: 'Invoices',
        zh: '發票管理',
        href: '/accounting/invoices',
      },
      {
        en: 'Journal Entries',
        zh: '會計傳票',
        href: '/accounting/journals',
      },
      {
        en: 'Financial Reports',
        zh: '財務報表',
        href: '/accounting/reports',
      },
    ],
  },
  {
    en: 'POS System',
    zh: 'POS 系統',
    href: '/pos',
    icon: '🛒',
    submenu: [
      {
        en: 'Sales',
        zh: '銷售紀錄',
        href: '/pos/sales',
      },
      {
        en: 'Members',
        zh: '會員管理',
        href: '/pos/members',
      },
      {
        en: 'Settlements',
        zh: '日結帳',
        href: '/pos/settlements',
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
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['/quotations'])

  return (
    <aside className="hidden md:flex md:w-64 bg-white border-r border-gray-200 h-full min-h-screen p-4 flex-col overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="mb-8">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-3 pb-4 border-b border-gray-200 group cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
            Q
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900 leading-tight">
              {locale === 'zh' ? '報價系統' : 'Quotation'}
            </div>
            <div className="text-xs text-gray-500">
              {locale === 'zh' ? '管理平台' : 'Management'}
            </div>
          </div>
        </Link>
      </div>

      <nav className="space-y-2 flex-1">
        {menuItems.map((item) => {
          const href = `/${locale}${item.href}`
          const isActive = item.href === '/settings'
            ? pathname === href
            : pathname.startsWith(href)
          const hasSubmenu = item.submenu && item.submenu.length > 0
          const isExpanded = expandedMenus.includes(item.href)

          return (
            <div key={item.href}>
              {hasSubmenu ? (
                <button
                  onClick={() => {
                    setExpandedMenus(prev =>
                      prev.includes(item.href)
                        ? prev.filter(h => h !== item.href)
                        : [...prev, item.href]
                    )
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors select-none ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
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
                </button>
              ) : (
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors select-none ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  <span className="whitespace-nowrap">
                    {locale === 'en' ? item.en : item.zh}
                  </span>
                </Link>
              )}

              {hasSubmenu && isExpanded && (
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
