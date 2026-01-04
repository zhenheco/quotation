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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavigationItem {
  name: { en: string; zh: string }
  href: string
  icon: LucideIcon
  children?: NavigationItem[]
}

const navigation: NavigationItem[] = [
  {
    name: { en: 'Dashboard', zh: '儀表板' },
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: { en: 'Products', zh: '服務/項目' },
    href: '/products',
    icon: Package,
  },
  {
    name: { en: 'Suppliers', zh: '供應商' },
    href: '/suppliers',
    icon: Factory,
  },
  {
    name: { en: 'Customers', zh: '客戶' },
    href: '/customers',
    icon: UserCheck,
  },
  {
    name: { en: 'Quotations', zh: '報價管理' },
    href: '/quotations',
    icon: FileText,
    children: [
      {
        name: { en: 'All Quotations', zh: '所有報價單' },
        href: '/quotations',
        icon: List,
      },
      {
        name: { en: 'Payments', zh: '收款管理' },
        href: '/payments',
        icon: Wallet,
      },
    ],
  },
  {
    name: { en: 'Accounting', zh: '會計系統' },
    href: '/accounting',
    icon: Calculator,
    children: [
      {
        name: { en: 'Invoices', zh: '發票管理' },
        href: '/accounting/invoices',
        icon: Receipt,
      },
      {
        name: { en: 'Journal Entries', zh: '會計傳票' },
        href: '/accounting/journals',
        icon: FileText,
      },
      {
        name: { en: 'Financial Reports', zh: '財務報表' },
        href: '/accounting/reports',
        icon: BarChart3,
      },
      {
        name: { en: 'Income Tax', zh: '營所稅申報' },
        href: '/accounting/income-tax',
        icon: Landmark,
      },
    ],
  },
  {
    name: { en: 'Guide', zh: '教學' },
    href: '/guide',
    icon: BookOpen,
  },
  {
    name: { en: 'Settings', zh: '系統設定' },
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  locale: string
}

export default function Sidebar({ locale }: SidebarProps) {
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

  const getName = (item: NavigationItem) => locale === 'en' ? item.name.en : item.name.zh

  return (
    <aside
      className={cn(
        'hidden md:flex h-screen flex-col border-r bg-gradient-to-b from-slate-50/80 to-white transition-all duration-300',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      {/* Logo - 現代圓潤風格 */}
      <div className="flex h-20 items-center border-b border-slate-100 px-4">
        <Link
          href={`/${locale}/dashboard`}
          className={cn(
            'flex items-center gap-3 transition-transform hover:scale-[1.02]',
            isCollapsed && 'justify-center'
          )}
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-800">
                {locale === 'zh' ? '報價系統' : 'Quote24'}
              </span>
              <span className="text-xs text-slate-400">
                {locale === 'zh' ? '專業報價管理' : 'Professional Quotes'}
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation - 更大的觸控目標和更柔和的樣式 */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-6">
        {navigation.map((item) => {
          const fullHref = `/${locale}${item.href}`
          const isActive = item.href === '/settings'
            ? pathname === fullHref
            : pathname.startsWith(fullHref)
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedItems.includes(item.href)
          const isChildActive = item.children?.some((child) => {
            const childHref = `/${locale}${child.href}`
            return pathname === childHref || pathname.startsWith(childHref)
          })

          return (
            <div key={item.href}>
              {/* Parent Item - 更大更圓潤 */}
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.href)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isChildActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:scale-[1.02]',
                    isCollapsed && 'justify-center px-3'
                  )}
                  title={isCollapsed ? getName(item) : undefined}
                >
                  <div className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
                    isChildActive ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-slate-200'
                  )}>
                    <item.icon
                      className={cn(
                        'h-5 w-5',
                        isChildActive ? 'text-emerald-600' : 'text-slate-500'
                      )}
                    />
                  </div>
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{getName(item)}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-slate-400 transition-transform duration-200',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={fullHref}
                  className={cn(
                    'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:scale-[1.02]',
                    isCollapsed && 'justify-center px-3'
                  )}
                  title={isCollapsed ? getName(item) : undefined}
                >
                  <div className={cn(
                    'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors',
                    isActive ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-slate-200'
                  )}>
                    <item.icon
                      className={cn(
                        'h-5 w-5',
                        isActive ? 'text-white' : 'text-slate-500'
                      )}
                    />
                  </div>
                  {!isCollapsed && <span>{getName(item)}</span>}
                </Link>
              )}

              {/* Child Items - 縮進的子選單 */}
              {hasChildren && isExpanded && !isCollapsed && (
                <div className="mt-1.5 ml-6 space-y-1 border-l-2 border-slate-100 pl-4">
                  {item.children?.map((child) => {
                    const childHref = `/${locale}${child.href}`
                    const isChildItemActive = pathname === childHref
                    return (
                      <Link
                        key={child.href}
                        href={childHref}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                          isChildItemActive
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
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
                        {getName(child)}
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
            'flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700',
            isCollapsed && 'justify-center'
          )}
          title={isCollapsed ? (locale === 'zh' ? '展開側邊欄' : 'Expand Sidebar') : (locale === 'zh' ? '收合側邊欄' : 'Collapse Sidebar')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="text-sm">{locale === 'zh' ? '收合側邊欄' : 'Collapse'}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
