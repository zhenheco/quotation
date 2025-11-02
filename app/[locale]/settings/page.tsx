import { getTranslations } from 'next-intl/server';
import CompanySettings from './CompanySettings';
import PageHeader from '@/components/ui/PageHeader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });
  return {
    title: t('title'),
  };
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' });

  return (
    <>
      <PageHeader
        title={t('title')}
        description={locale === 'zh' ? '管理您的公司資訊、成員和設定' : 'Manage your company information, members, and settings'}
      />
      <CompanySettings locale={locale} />
    </>
  );
}
