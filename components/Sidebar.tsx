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
    ],
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
        'hidden md:flex h-screen flex-col border-r bg-card transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-3">
        <Link
          href={`/${locale}/dashboard`}
          className={cn(
            'flex items-center',
            isCollapsed ? 'justify-center' : 'space-x-2'
          )}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold">
              {locale === 'zh' ? '報價系統' : 'Quotation'}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
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
              {/* Parent Item */}
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.href)}
                  className={cn(
                    'group flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isChildActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? getName(item) : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      !isCollapsed && 'mr-3',
                      isChildActive ? 'text-accent-foreground' : 'text-muted-foreground'
                    )}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{getName(item)}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
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
                    'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center'
                  )}
                  title={isCollapsed ? getName(item) : undefined}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      !isCollapsed && 'mr-3',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}
                  />
                  {!isCollapsed && getName(item)}
                </Link>
              )}

              {/* Child Items */}
              {hasChildren && isExpanded && !isCollapsed && (
                <div className="mt-1 space-y-1 pl-4">
                  {item.children?.map((child) => {
                    const childHref = `/${locale}${child.href}`
                    const isChildItemActive = pathname === childHref
                    return (
                      <Link
                        key={child.href}
                        href={childHref}
                        className={cn(
                          'group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isChildItemActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                      >
                        <child.icon
                          className={cn(
                            'h-4 w-4 flex-shrink-0 mr-3',
                            isChildItemActive
                              ? 'text-primary-foreground'
                              : 'text-muted-foreground'
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

      {/* Footer */}
      <div className="border-t">
        {/* Toggle Button */}
        <div className="p-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'flex w-full cursor-pointer items-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? (locale === 'zh' ? '展開側邊欄' : 'Expand Sidebar') : (locale === 'zh' ? '收合側邊欄' : 'Collapse Sidebar')}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="mr-2 h-5 w-5" />
                <span className="text-xs">{locale === 'zh' ? '收合' : 'Collapse'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
