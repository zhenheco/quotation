'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import CompanySettings from './CompanySettings';
import PageHeader from '@/components/ui/PageHeader';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const [triggerCreate, setTriggerCreate] = useState(false);

  const handleCreateCompany = () => {
    setTriggerCreate(prev => !prev);
  };

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={{
          label: t('addCompany'),
          onClick: handleCreateCompany
        }}
      />
      <CompanySettings locale={locale} triggerCreate={triggerCreate} />
    </>
  );
}
