'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Company {
  id: string;
  name: {
    zh: string;
    en: string;
  };
  logo_url?: string;
  signature_url?: string;
  passbook_url?: string;
  tax_id?: string;
  bank_name?: string;
  bank_account?: string;
  bank_code?: string;
  address?: {
    zh: string;
    en: string;
  };
  phone?: string;
  email?: string;
  website?: string;
}

interface CompanySettingsProps {
  locale: string;
}

export default function CompanySettings({ locale }: CompanySettingsProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, signature: false, passbook: false });

  const supabase = createClient();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data.map((c: any) => ({
          id: c.company_id,
          name: c.company_name,
          logo_url: c.logo_url
        })));

        // Select the first company or the one from localStorage
        const storedCompanyId = localStorage.getItem('selectedCompanyId');
        if (storedCompanyId) {
          loadCompany(storedCompanyId);
        } else if (data.length > 0) {
          loadCompany(data[0].company_id);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompany = async (companyId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedCompany(data);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error loading company:', error);
    }
  };

  const handleCreateCompany = () => {
    setIsCreating(true);
    setSelectedCompany({
      id: '',
      name: { zh: '', en: '' },
      address: { zh: '', en: '' }
    });
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setSaving(true);
    try {
      const payload = {
        name_zh: selectedCompany.name.zh,
        name_en: selectedCompany.name.en,
        tax_id: selectedCompany.tax_id,
        bank_name: selectedCompany.bank_name,
        bank_account: selectedCompany.bank_account,
        bank_code: selectedCompany.bank_code,
        address_zh: selectedCompany.address?.zh,
        address_en: selectedCompany.address?.en,
        phone: selectedCompany.phone,
        email: selectedCompany.email,
        website: selectedCompany.website,
        logo_url: selectedCompany.logo_url,
        signature_url: selectedCompany.signature_url,
        passbook_url: selectedCompany.passbook_url
      };

      let response;
      if (isCreating) {
        response = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`/api/companies/${selectedCompany.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        const data = await response.json();
        alert(locale === 'zh' ? '保存成功！' : 'Saved successfully!');
        await fetchCompanies();
        loadCompany(data.id);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file: File, type: 'logo' | 'signature' | 'passbook') => {
    if (!selectedCompany || !selectedCompany.id) {
      alert(locale === 'zh' ? '請先保存公司資料' : 'Please save company first');
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [type]: true }));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${type}.${fileExt}`;
      const filePath = `${selectedCompany.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('company-files')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('company-files')
        .getPublicUrl(filePath);

      // Update company with file URL
      const updateData: any = {};
      if (type === 'logo') updateData.logo_url = publicUrl;
      if (type === 'signature') updateData.signature_url = publicUrl;
      if (type === 'passbook') updateData.passbook_url = publicUrl;

      const response = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await loadCompany(selectedCompany.id);
        alert(locale === 'zh' ? '上傳成功！' : 'Uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(locale === 'zh' ? '上傳失敗' : 'Upload failed');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Company List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {locale === 'zh' ? '我的公司' : 'My Companies'}
          </h2>
          <button
            onClick={handleCreateCompany}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + {locale === 'zh' ? '新增公司' : 'Add Company'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              onClick={() => loadCompany(company.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedCompany?.id === company.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {company.logo_url ? (
                  <img src={company.logo_url} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xl text-gray-500">🏢</span>
                  </div>
                )}
                <div>
                  <div className="font-medium">{locale === 'zh' ? company.name.zh : company.name.en}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company Form */}
      {selectedCompany && (
        <form onSubmit={handleSaveCompany} className="bg-white rounded-lg shadow p-6 space-y-6">
          <h2 className="text-xl font-semibold">
            {isCreating
              ? (locale === 'zh' ? '新增公司' : 'Create Company')
              : (locale === 'zh' ? '編輯公司' : 'Edit Company')}
          </h2>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh' ? '公司名稱（中文）' : 'Company Name (Chinese)'}
              </label>
              <input
                type="text"
                required
                value={selectedCompany.name.zh}
                onChange={(e) => setSelectedCompany({
                  ...selectedCompany,
                  name: { ...selectedCompany.name, zh: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh' ? '公司名稱（英文）' : 'Company Name (English)'}
              </label>
              <input
                type="text"
                required
                value={selectedCompany.name.en}
                onChange={(e) => setSelectedCompany({
                  ...selectedCompany,
                  name: { ...selectedCompany.name, en: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh' ? '統一編號' : 'Tax ID'}
              </label>
              <input
                type="text"
                value={selectedCompany.tax_id || ''}
                onChange={(e) => setSelectedCompany({ ...selectedCompany, tax_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh' ? '電話' : 'Phone'}
              </label>
              <input
                type="tel"
                value={selectedCompany.phone || ''}
                onChange={(e) => setSelectedCompany({ ...selectedCompany, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh' ? '電子郵件' : 'Email'}
              </label>
              <input
                type="email"
                value={selectedCompany.email || ''}
                onChange={(e) => setSelectedCompany({ ...selectedCompany, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh' ? '網站' : 'Website'}
              </label>
              <input
                type="url"
                value={selectedCompany.website || ''}
                onChange={(e) => setSelectedCompany({ ...selectedCompany, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh' ? '地址（中文）' : 'Address (Chinese)'}
              </label>
              <textarea
                value={selectedCompany.address?.zh || ''}
                onChange={(e) => setSelectedCompany({
                  ...selectedCompany,
                  address: { ...selectedCompany.address, zh: e.target.value, en: selectedCompany.address?.en || '' }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh' ? '地址（英文）' : 'Address (English)'}
              </label>
              <textarea
                value={selectedCompany.address?.en || ''}
                onChange={(e) => setSelectedCompany({
                  ...selectedCompany,
                  address: { zh: selectedCompany.address?.zh || '', en: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Bank Info */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">
              {locale === 'zh' ? '銀行資訊' : 'Bank Information'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === 'zh' ? '銀行名稱' : 'Bank Name'}
                </label>
                <input
                  type="text"
                  value={selectedCompany.bank_name || ''}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === 'zh' ? '銀行代碼' : 'Bank Code'}
                </label>
                <input
                  type="text"
                  value={selectedCompany.bank_code || ''}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, bank_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === 'zh' ? '銀行帳號' : 'Bank Account'}
                </label>
                <input
                  type="text"
                  value={selectedCompany.bank_account || ''}
                  onChange={(e) => setSelectedCompany({ ...selectedCompany, bank_account: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* File Uploads */}
          {!isCreating && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium mb-4">
                {locale === 'zh' ? '檔案上傳' : 'File Uploads'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === 'zh' ? '公司 Logo' : 'Company Logo'}
                  </label>
                  {selectedCompany.logo_url && (
                    <img src={selectedCompany.logo_url} alt="Logo" className="w-32 h-32 object-cover mb-2 rounded" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'logo')}
                    disabled={uploading.logo}
                    className="w-full text-sm"
                  />
                </div>

                {/* Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === 'zh' ? '負責人簽名' : 'Signature'}
                  </label>
                  {selectedCompany.signature_url && (
                    <img src={selectedCompany.signature_url} alt="Signature" className="w-32 h-32 object-cover mb-2 rounded" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'signature')}
                    disabled={uploading.signature}
                    className="w-full text-sm"
                  />
                </div>

                {/* Passbook */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === 'zh' ? '存摺封面' : 'Passbook'}
                  </label>
                  {selectedCompany.passbook_url && (
                    <img src={selectedCompany.passbook_url} alt="Passbook" className="w-32 h-32 object-cover mb-2 rounded" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], 'passbook')}
                    disabled={uploading.passbook}
                    className="w-full text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (locale === 'zh' ? '保存中...' : 'Saving...') : (locale === 'zh' ? '保存' : 'Save')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
