'use client'

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
    en: 'Quotations',
    zh: '報價單',
    href: '/quotations',
    icon: '📄',
  },
  {
    en: 'Customers',
    zh: '客戶',
    href: '/customers',
    icon: '👥',
  },
  {
    en: 'Products',
    zh: '產品',
    href: '/products',
    icon: '📦',
  },
]

export default function Sidebar({ locale }: { locale: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const href = `/${locale}${item.href}`
          const isActive = pathname === href

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{locale === 'en' ? item.en : item.zh}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
