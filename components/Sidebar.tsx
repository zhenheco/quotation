"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ClipboardCheck,
  BookOpen,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    name: "儀表板",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "服務/項目",
    href: "/products",
    icon: Package,
  },
  {
    name: "供應商",
    href: "/suppliers",
    icon: Factory,
  },
  {
    name: "客戶",
    href: "/customers",
    icon: UserCheck,
  },
  {
    name: "報價管理",
    href: "/quotations",
    icon: FileText,
    children: [
      {
        name: "所有報價單",
        href: "/quotations",
        icon: List,
      },
      {
        name: "收款管理",
        href: "/payments",
        icon: Wallet,
      },
    ],
  },
  {
    name: "訂單管理",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    name: "出貨管理",
    href: "/shipments",
    icon: Truck,
  },
  {
    name: "會計系統",
    href: "/accounting",
    icon: Calculator,
    children: [
      {
        name: "發票管理",
        href: "/accounting/invoices",
        icon: Receipt,
      },
      {
        name: "會計傳票",
        href: "/accounting/journals",
        icon: FileText,
      },
      {
        name: "營業稅申報",
        href: "/accounting/tax-filing",
        icon: ClipboardCheck,
      },
      {
        name: "財務報表",
        href: "/accounting/reports",
        icon: BarChart3,
      },
      {
        name: "營所稅申報",
        href: "/accounting/income-tax",
        icon: Landmark,
      },
    ],
  },
  {
    name: "教學",
    href: "/guide",
    icon: BookOpen,
  },
  {
    name: "訂閱方案",
    href: "/pricing",
    icon: Sparkles,
  },
  {
    name: "系統設定",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([
    "/quotations",
    "/accounting",
  ]);

  const toggleExpanded = (itemHref: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemHref)
        ? prev.filter((href) => href !== itemHref)
        : [...prev, itemHref],
    );
  };

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
        isCollapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 transition-opacity hover:opacity-90",
            isCollapsed && "justify-center",
          )}
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-foreground">
                Quote24
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                Professional Quotation
              </span>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            item.href === "/settings"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.includes(item.href);
          const isChildActive = item.children?.some(
            (child) =>
              pathname === child.href || pathname.startsWith(child.href),
          );

          return (
            <div key={item.href}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(item.href)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                    isChildActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isCollapsed && "justify-center px-2",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] flex-shrink-0",
                      isChildActive
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground/50 transition-transform duration-150",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    isCollapsed && "justify-center px-2",
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] flex-shrink-0",
                      isActive
                        ? "text-primary-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              )}

              {hasChildren && isExpanded && !isCollapsed && (
                <div className="mt-0.5 ml-7 space-y-0.5 border-l border-border pl-3">
                  {item.children?.map((child) => {
                    const isChildItemActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
                          isChildItemActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <child.icon
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isChildItemActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground",
                          )}
                        />
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground",
            isCollapsed && "justify-center",
          )}
          title={isCollapsed ? "展開側邊欄" : "收合側邊欄"}
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
  );
}
