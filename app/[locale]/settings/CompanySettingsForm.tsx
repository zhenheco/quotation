'use client';

import { useState, useEffect } from 'use';
import { useTranslations } from 'next-intl';
import PageHeader from '@/components/ui/PageHeader';

export default function CompanySettingsForm() {
  const t = useTranslations('settings');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch('/api/company-settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        company_name: {
          zh: formData.get('company_name_zh'),
          en: formData.get('company_name_en'),
        },
        tax_id: formData.get('tax_id'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        bank_name: formData.get('bank_name'),
        account_number: formData.get('account_number'),
        account_name: formData.get('account_name'),
      };

      const method = settings ? 'PUT' : 'POST';
      const res = await fetch('/api/company-settings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        alert(t('saveSuccess'));
      } else {
        alert(t('saveError'));
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert(t('saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">加載中...</div>;
  }

  const companyName = settings?.company_name || {};

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
        {/* Company Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">{t('company_info')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('company_name_zh')}
              </label>
              <input
                type="text"
                name="company_name_zh"
                defaultValue={companyName.zh || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="振禾有限公司"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('company_name_en')}
              </label>
              <input
                type="text"
                name="company_name_en"
                defaultValue={companyName.en || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Acme Corporation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tax_id')}
              </label>
              <input
                type="text"
                name="tax_id"
                defaultValue={settings?.tax_id || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="12345678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('phone')}
              </label>
              <input
                type="tel"
                name="phone"
                defaultValue={settings?.phone || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="+886 2 1234 5678"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('email')}
              </label>
              <input
                type="email"
                name="email"
                defaultValue={settings?.email || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="contact@example.com"
              />
            </div>
          </div>
        </div>

        {/* Bank Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">{t('bank_info')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('bank_name')}
              </label>
              <input
                type="text"
                name="bank_name"
                defaultValue={settings?.bank_name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="台灣銀行"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('account_number')}
              </label>
              <input
                type="text"
                name="account_number"
                defaultValue={settings?.account_number || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="1234567890"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('account_name')}
              </label>
              <input
                type="text"
                name="account_name"
                defaultValue={settings?.account_name || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="振禾有限公司"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </form>
    </div>
  );
}
