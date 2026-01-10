'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  List,
  BarChart3,
  FileSpreadsheet,
  Package,
  Calculator,
  Factory,
  UserCheck,
  Wallet,
  Landmark,
  BookOpen,
  ShoppingCart,
  Truck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  {
    name: '儀表板',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: '服務/項目',
    href: '/products',
    icon: Package,
  },
  {
    name: '供應商',
    href: '/suppliers',
    icon: Factory,
  },
  {
    name: '客戶',
    href: '/customers',
    icon: UserCheck,
  },
  {
    name: '報價管理',
    href: '/quotations',
    icon: FileText,
    children: [
      {
        name: '所有報價單',
        href: '/quotations',
        icon: List,
      },
      {
        name: '收款管理',
        href: '/payments',
        icon: Wallet,
      },
    ],
  },
  {
    name: '訂單管理',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    name: '出貨管理',
    href: '/shipments',
    icon: Truck,
  },
  {
    name: '會計系統',
    href: '/accounting',
    icon: Calculator,
    children: [
      {
        name: '發票管理',
        href: '/accounting/invoices',
        icon: Receipt,
      },
      {
        name: '會計傳票',
        href: '/accounting/journals',
        icon: FileText,
      },
      {
        name: '財務報表',
        href: '/accounting/reports',
        icon: BarChart3,
      },
      {
        name: '營所稅申報',
        href: '/accounting/income-tax',
        icon: Landmark,
      },
    ],
  },
  {
    name: '教學',
    href: '/guide',
    icon: BookOpen,
  },
  {
    name: '系統設定',
    href: '/settings',
    icon: Settings,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['/quotations', '/accounting'])

  const toggleExpanded = (itemHref: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemHref)
        ? prev.filter((href) => href !== itemHref)
        : [...prev, itemHref]
    )
  }

  return (
    <aside
      className={cn(
        'hidden md:flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200',
        isCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo - 專業金融風格 */}
      <div className="flex h-16 items-center border-b border-slate-100 px-4">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 transition-opacity hover:opacity-90',
            isCollapsed && 'justify-center'
          )}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-slate-800">Quote24</span>
              <span className="text-[11px] font-medium text-slate-400">Professional Quotation</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation - 專業簡潔風格 */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive = item.href === '/settings'
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedItems.includes(item.href)
          const isChildActive = item.children?.some((child) =>
            pathname === child.href || pathname.startsWith(child.href)
          )

          return (
            <div key={item.href}>
              {/* Parent Item - 專業簡潔 */}
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.href)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors duration-150',
                    isChildActive
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] flex-shrink-0',
                      isChildActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-500'
                    )}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-slate-300 transition-transform duration-150',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                    isCollapsed && 'justify-center px-2'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-[18px] w-[18px] flex-shrink-0',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-500'
                    )}
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              )}

              {/* Child Items - 簡潔子選單 */}
              {hasChildren && isExpanded && !isCollapsed && (
                <div className="mt-0.5 ml-7 space-y-0.5 border-l border-slate-200 pl-3">
                  {item.children?.map((child) => {
                    const isChildItemActive = pathname === child.href
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                          isChildItemActive
                            ? 'bg-teal-700 text-white'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        )}
                      >
                        <child.icon
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            isChildItemActive
                              ? 'text-white'
                              : 'text-slate-400'
                          )}
                        />
                        {child.name}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer - 收合按鈕 */}
      <div className="border-t border-slate-100 p-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-slate-400 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-600',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? '展開側邊欄' : '收合側邊欄'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[13px]">收合</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
