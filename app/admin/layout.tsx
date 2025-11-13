/**
 * 超級管理員控制台佈局
 *
 * 功能：
 * - 僅超級管理員可存取
 * - 提供統一的導航側邊欄
 * - 包含管理員專用的頁首
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/dal/rbac';
import { getD1Client } from '@/lib/db/d1-client';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export const metadata = {
  title: '超級管理員控制台',
  description: '系統管理員專用控制台',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 驗證使用者身份
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // 未登入則導向登入頁
  if (error || !user) {
    redirect('/login?redirect=/admin');
  }

  // 獲取 D1 client
  const { env } = await getCloudflareContext();
  const db = getD1Client(env);

  // 檢查是否為超級管理員（使用 D1）
  const isAdmin = await isSuperAdmin(db, user.id);
  if (!isAdmin) {
    // 非超管則導向首頁並顯示錯誤訊息
    redirect('/?error=unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 管理員頁首 */}
      <AdminHeader user={user} />

      <div className="flex">
        {/* 側邊導航欄 */}
        <AdminSidebar />

        {/* 主要內容區域 */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
