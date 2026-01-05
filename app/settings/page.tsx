'use client';

import { useState } from 'react';
import CompanySettings from './CompanySettings';
import PageHeader from '@/components/ui/PageHeader';

export default function SettingsPage() {
  const [triggerCreate, setTriggerCreate] = useState(false);

  const handleCreateCompany = () => {
    setTriggerCreate(prev => !prev);
  };

  return (
    <>
      <PageHeader
        title="公司設定"
        description="管理您的公司資訊和相關設定"
        action={{
          label: '新增公司',
          onClick: handleCreateCompany
        }}
      />
      <CompanySettings triggerCreate={triggerCreate} />
    </>
  );
}
