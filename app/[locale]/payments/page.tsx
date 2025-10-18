import { getTranslations } from 'next-intl/server';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import PageHeader from '@/components/ui/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'payments' });
  return {
    title: t('title'),
  };
}

export default async function PaymentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'payments' });

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar locale={locale} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar locale={locale} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            <PageHeader
              title={t('title')}
              description="追蹤收款狀態與逾期提醒"
            />
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="text-6xl mb-4">💰</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">收款管理功能</h2>
              <p className="text-gray-600 mb-6">
                此功能正在開發中，將包含：
              </p>
              <ul className="text-left max-w-md mx-auto space-y-2 text-gray-700">
                <li>✅ 收款記錄追蹤</li>
                <li>✅ 未收款/已收款狀態</li>
                <li>✅ 逾期付款提醒</li>
                <li>✅ 收款統計報表</li>
                <li>✅ 付款收據上傳</li>
                <li>✅ 自動發送付款通知</li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
