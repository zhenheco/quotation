'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  Users,
  Wallet,
  MoreHorizontal,
  X,
  Package,
  Factory,
  Settings,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  name: string
  href: string
  icon: LucideIcon
}

// 主要導航項目（顯示在底部欄）
const primaryItems: MenuItem[] = [
  {
    name: '首頁',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: '報價',
    href: '/quotations',
    icon: FileText,
  },
  {
    name: '客戶',
    href: '/customers',
    icon: Users,
  },
  {
    name: '收款',
    href: '/payments',
    icon: Wallet,
  },
]

// 更多選單項目
const moreItems: MenuItem[] = [
  {
    name: '項目',
    href: '/products',
    icon: Package,
  },
  {
    name: '供應商',
    href: '/suppliers',
    icon: Factory,
  },
  {
    name: '訂單',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    name: '出貨',
    href: '/shipments',
    icon: Truck,
  },
  {
    name: '設定',
    href: '/settings',
    icon: Settings,
  },
]

export default function MobileNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)

  // 檢查是否有「更多」項目處於活躍狀態
  const isMoreActive = moreItems.some((item) =>
    pathname.startsWith(item.href)
  )

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowMore(false)}
          />

          <div className="absolute bottom-20 left-4 right-4 bg-card rounded-xl shadow-xl border border-border p-4 animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                更多功能
              </h3>
              <button
                onClick={() => setShowMore(false)}
                className="p-1.5 rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent/50 text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-card pb-safe touch-manipulation">
        <div className="flex items-center justify-around bg-card border-t border-border py-2 px-1">
          {primaryItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-[56px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">
                  {item.name}
                </span>
              </Link>
            )
          })}

          <button
            onClick={() => setShowMore(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-[56px]',
              isMoreActive || showMore
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">
              更多
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
