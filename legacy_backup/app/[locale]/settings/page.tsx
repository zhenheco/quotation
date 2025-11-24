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
        description={locale === 'zh' ? '管理您的公司資訊、成員和設定' : 'Manage your company information, members, and settings'}
        action={{
          label: locale === 'zh' ? '新增公司' : 'Add Company',
          onClick: handleCreateCompany
        }}
      />
      <CompanySettings locale={locale} triggerCreate={triggerCreate} />
    </>
  );
}
