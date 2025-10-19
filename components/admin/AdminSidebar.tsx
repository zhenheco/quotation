/**
 * 管理員側邊導航欄
 *
 * 提供管理員控制台的主要導航：
 * - 儀表板
 * - 公司管理
 * - 使用者管理
 * - 權限管理
 * - 系統設定
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string; // 使用 emoji 代替圖示組件
  description: string;
}

const navigation: NavItem[] = [
  {
    name: '儀表板',
    href: '/admin',
    icon: '🏠',
    description: '系統概覽與統計'
  },
  {
    name: '公司管理',
    href: '/admin/companies',
    icon: '🏢',
    description: '管理所有公司'
  },
  {
    name: '使用者管理',
    href: '/admin/users',
    icon: '👥',
    description: '管理所有使用者'
  },
  {
    name: '權限管理',
    href: '/admin/permissions',
    icon: '🛡️',
    description: '管理角色與權限'
  },
  {
    name: '系統統計',
    href: '/admin/analytics',
    icon: '📊',
    description: '查看系統使用統計'
  },
  {
    name: '系統設定',
    href: '/admin/settings',
    icon: '⚙️',
    description: '系統設定與配置'
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${active
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              title={item.description}
            >
              <span className="text-xl mr-3 flex-shrink-0">
                {item.icon}
              </span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* 快速統計 */}
      <div className="p-4 mt-8 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          快速資訊
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">系統版本</span>
            <span className="font-medium text-gray-900">v1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">環境</span>
            <span className="font-medium text-green-600">開發</span>
          </div>
        </div>
      </div>

      {/* 輔助連結 */}
      <div className="p-4 border-t border-gray-200">
        <div className="space-y-1">
          <Link
            href="/admin/help"
            className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
          >
            說明文件
          </Link>
          <Link
            href="/"
            className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
          >
            返回主系統
          </Link>
        </div>
      </div>
    </aside>
  );
}
