'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ObservabilityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <ObservabilityNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function ObservabilityNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/observability', label: '總覽', icon: '📊' },
    { href: '/observability/logs', label: '日誌', icon: '📝' },
    { href: '/observability/metrics', label: '指標', icon: '📈' },
    { href: '/observability/traces', label: '追蹤', icon: '🔍' },
    { href: '/observability/alerts', label: '告警', icon: '🚨' },
  ];

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center space-x-8">
          <div className="text-lg font-semibold">觀測系統</div>
          <div className="flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
