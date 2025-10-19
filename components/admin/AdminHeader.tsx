/**
 * 管理員頁首組件
 *
 * 顯示：
 * - 系統標題
 * - 超級管理員標識
 * - 使用者資訊
 * - 登出按鈕
 */

'use client';

import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface AdminHeaderProps {
  user: User;
}

export default function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          {/* 左側：標題 */}
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">
              超級管理員控制台
            </h1>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
              Super Admin
            </span>
          </div>

          {/* 右側：使用者資訊 */}
          <div className="flex items-center space-x-4">
            {/* 使用者資訊 */}
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {user.user_metadata?.full_name || user.email}
              </p>
              <p className="text-xs text-gray-500">
                {user.email}
              </p>
            </div>

            {/* 使用者頭像 */}
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
              {(user.user_metadata?.full_name?.[0] || user.email?.[0] || 'A').toUpperCase()}
            </div>

            {/* 登出按鈕 */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
