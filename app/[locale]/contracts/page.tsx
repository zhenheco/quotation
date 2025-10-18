import { getTranslations } from 'next-intl/server';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import PageHeader from '@/components/ui/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contracts' });
  return {
    title: t('title'),
  };
}

export default async function ContractsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contracts' });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar locale={locale} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar locale={locale} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            <PageHeader
              title={t('title')}
              description="管理客戶合約與付款排程"
            />
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">合約管理功能</h2>
              <p className="text-gray-600 mb-6">
                此功能正在開發中，將包含：
              </p>
              <ul className="text-left max-w-md mx-auto space-y-2 text-gray-700">
                <li>✅ 客戶合約建立與管理</li>
                <li>✅ 自動產生付款排程（季繳/半年繳/年繳）</li>
                <li>✅ 合約狀態追蹤</li>
                <li>✅ 合約到期提醒</li>
                <li>✅ 合約檔案上傳</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
