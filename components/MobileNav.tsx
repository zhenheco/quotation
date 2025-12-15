'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  {
    en: 'Dashboard',
    zh: '首頁',
    href: '/dashboard',
    icon: '🏠',
  },
  {
    en: 'Products',
    zh: '項目',
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
    zh: '報價',
    href: '/quotations',
    icon: '📄',
  },
  {
    en: 'Payments',
    zh: '收款',
    href: '/payments',
    icon: '💰',
  },
  {
    en: 'Settings',
    zh: '設定',
    href: '/settings',
    icon: '⚙️',
  },
]

export default function MobileNav({ locale }: { locale: string }) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16 pb-safe">
        {menuItems.map((item) => {
          const href = `/${locale}${item.href}`
          const isActive = pathname.startsWith(href)

          return (
            <Link
              key={item.href}
              href={href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">
                {locale === 'en' ? item.en : item.zh}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
