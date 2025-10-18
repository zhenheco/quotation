import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import CompanySettingsForm from './CompanySettingsForm';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'settings' });
  return {
    title: t('title'),
  };
}

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CompanySettingsForm />
    </div>
  );
}
