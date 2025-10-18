import { getTranslations } from 'next-intl/server';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import CompanySettingsForm from './CompanySettingsForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });
  return {
    title: t('title'),
  };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar locale={locale} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar locale={locale} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-8">
            <CompanySettingsForm />
          </div>
        </main>
      </div>
    </div>
  );
}
