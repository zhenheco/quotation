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
      {/* 更多選單面板 */}
      {showMore && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowMore(false)}
          />

          {/* 選單內容 - 專業簡潔風格 */}
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-xl border border-slate-200 p-4 animate-scale-in">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">
                更多功能
              </h3>
              <button
                onClick={() => setShowMore(false)}
                className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4 text-slate-500" />
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
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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

      {/* 底部導航欄 - 專業簡潔 */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-white pb-safe touch-manipulation">
        <div className="flex items-center justify-around bg-white border-t border-slate-200 py-2 px-1">
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
                    ? 'text-teal-700'
                    : 'text-slate-400'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">
                  {item.name}
                </span>
              </Link>
            )
          })}

          {/* 更多按鈕 */}
          <button
            onClick={() => setShowMore(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors min-w-[56px]',
              isMoreActive || showMore
                ? 'text-teal-700'
                : 'text-slate-400'
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
