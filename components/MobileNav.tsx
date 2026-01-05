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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

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
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />

          {/* 選單內容 */}
          <div className="absolute bottom-24 left-4 right-4 bg-white rounded-3xl shadow-2xl p-4 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">
                更多功能
              </h3>
              <button
                onClick={() => setShowMore(false)}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl transition-all',
                      isActive
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="text-xs font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 浮動底部導航欄 */}
      <nav className="fixed bottom-4 left-4 right-4 md:hidden z-40">
        <div className="flex items-center justify-around bg-white/90 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-100 py-2 px-1">
          {primaryItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all min-w-[60px]',
                  isActive
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-slate-400'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'h-6 w-6')} />
                {isActive && (
                  <span className="text-xs font-medium">{item.name}</span>
                )}
              </Link>
            )
          })}

          {/* 更多按鈕 */}
          <button
            onClick={() => setShowMore(true)}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all min-w-[60px]',
              isMoreActive || showMore
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400'
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            {(isMoreActive || showMore) && (
              <span className="text-xs font-medium">更多</span>
            )}
          </button>
        </div>
      </nav>
    </>
  )
}
