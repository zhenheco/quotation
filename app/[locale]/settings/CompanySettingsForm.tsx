'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import PageHeader from '@/components/ui/PageHeader';
import { createClient } from '@/lib/supabase/client';

export default function CompanySettingsForm() {
  const t = useTranslations('settings');
  const supabase = createClient();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<{
    logo?: boolean;
    signature?: boolean;
    passbook?: boolean;
  }>({});

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

  async function uploadFile(file: File, type: 'logo' | 'signature' | 'passbook') {
    try {
      setUploading(prev => ({ ...prev, [type]: true }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${type}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('company-files')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-files')
        .getPublicUrl(filePath);

      // Update company settings with file URL
      const updateData: any = {};
      if (type === 'logo') updateData.logo_url = publicUrl;
      if (type === 'signature') updateData.signature_url = publicUrl;
      if (type === 'passbook') updateData.passbook_url = publicUrl;

      const res = await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        alert(`${type === 'logo' ? 'Logo' : type === 'signature' ? '簽章' : '存摺影本'}上傳成功`);
      }
    } catch (error) {
      console.error(`Failed to upload ${type}:`, error);
      alert(`上傳失敗：${error instanceof Error ? error.message : '未知錯誤'}`);
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
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

        {/* File Uploads */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">檔案上傳</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('upload_logo')}
              </label>
              {settings?.logo_url && (
                <div className="mb-2">
                  <img
                    src={settings.logo_url}
                    alt="Company Logo"
                    className="w-32 h-32 object-contain border rounded"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, 'logo');
                }}
                disabled={uploading.logo}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {uploading.logo && <p className="text-sm text-gray-500 mt-1">上傳中...</p>}
            </div>

            {/* Signature Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('upload_signature')}
              </label>
              {settings?.signature_url && (
                <div className="mb-2">
                  <img
                    src={settings.signature_url}
                    alt="Signature"
                    className="w-32 h-32 object-contain border rounded"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, 'signature');
                }}
                disabled={uploading.signature}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {uploading.signature && <p className="text-sm text-gray-500 mt-1">上傳中...</p>}
            </div>

            {/* Passbook Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('upload_passbook')}
              </label>
              {settings?.passbook_url && (
                <div className="mb-2">
                  <img
                    src={settings.passbook_url}
                    alt="Passbook"
                    className="w-32 h-32 object-contain border rounded"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, 'passbook');
                }}
                disabled={uploading.passbook}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {uploading.passbook && <p className="text-sm text-gray-500 mt-1">上傳中...</p>}
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
