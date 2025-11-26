'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

function getImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('/api/')) return url;
  if (url.includes('supabase.co/storage')) {
    const match = url.match(/company-files\/(.+)$/);
    if (match) {
      return `/api/storage/company-files?path=${encodeURIComponent(match[1])}`;
    }
  }
  return url;
}

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
  triggerCreate?: boolean;
}

export default function CompanySettings({ locale, triggerCreate }: CompanySettingsProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, signature: false, passbook: false });
  const [pendingFiles, setPendingFiles] = useState<{ logo?: File; signature?: File; passbook?: File }>({});

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json() as Company[];
        setCompanies(data);

        // Select the first company or the one from localStorage
        const storedCompanyId = localStorage.getItem('selectedCompanyId');
        // Verify that storedCompanyId exists in current user's companies
        const isValidCompanyId = storedCompanyId && data.some((c) => c.id === storedCompanyId);

        if (isValidCompanyId) {
          loadCompany(storedCompanyId);
        } else if (data.length > 0) {
          // Clear invalid stored company ID
          localStorage.removeItem('selectedCompanyId');
          loadCompany(data[0].id);
          localStorage.setItem('selectedCompanyId', data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const loadCompany = async (companyId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}`);
      if (response.ok) {
        const data: Company = await response.json();
        setSelectedCompany(data);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error loading company:', error);
    }
  };

  useEffect(() => {
    if (triggerCreate) {
      setIsCreating(true);
      setSelectedCompany({
        id: '',
        name: { zh: '', en: '' },
        address: { zh: '', en: '' }
      });
    }
  }, [triggerCreate]);

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    setSaving(true);
    try {
      const payload = {
        name: selectedCompany.name,
        tax_id: selectedCompany.tax_id,
        bank_name: selectedCompany.bank_name,
        bank_account: selectedCompany.bank_account,
        bank_code: selectedCompany.bank_code,
        address: selectedCompany.address,
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
        const data: Company = await response.json();

        // 如果是新增且有暫存檔案，立即上傳
        if (isCreating && Object.keys(pendingFiles).length > 0) {
          await uploadPendingFiles(data.id);
        }

        alert(locale === 'zh' ? '保存成功！' : 'Saved successfully!');
        await fetchCompanies();
        loadCompany(data.id);
        setIsCreating(false);
        setPendingFiles({});
      } else {
        const error: { error?: string } = await response.json();
        alert(error.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = (file: File | null, type: 'logo' | 'signature' | 'passbook') => {
    if (!file) return;

    if (isCreating) {
      // 新增模式：暫存檔案
      setPendingFiles(prev => ({ ...prev, [type]: file }));
    } else {
      // 編輯模式：直接上傳
      uploadFile(file, type);
    }
  };

  const uploadPendingFiles = async (companyId: string) => {
    const fileTypes: Array<'logo' | 'signature' | 'passbook'> = ['logo', 'signature', 'passbook'];

    for (const type of fileTypes) {
      const file = pendingFiles[type];
      if (file) {
        try {
          setUploading(prev => ({ ...prev, [type]: true }));

          const formData = new FormData();
          formData.append('file', file);
          formData.append('companyId', companyId);
          formData.append('type', type);

          const uploadResponse = await fetch('/api/upload/company-files', {
            method: 'POST',
            body: formData
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({})) as { error?: string };
            throw new Error(errorData.error || 'Upload failed');
          }

          const { url } = await uploadResponse.json() as { url: string };

          const updateData: Record<string, string> = {};
          if (type === 'logo') updateData.logo_url = url;
          if (type === 'signature') updateData.signature_url = url;
          if (type === 'passbook') updateData.passbook_url = url;

          await fetch(`/api/companies/${companyId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
          });
        } catch (error) {
          console.error(`Upload error for ${type}:`, error);
        } finally {
          setUploading(prev => ({ ...prev, [type]: false }));
        }
      }
    }
  };

  const uploadFile = async (file: File, type: 'logo' | 'signature' | 'passbook') => {
    if (!selectedCompany || !selectedCompany.id) {
      return;
    }

    try {
      setUploading(prev => ({ ...prev, [type]: true }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('companyId', selectedCompany.id);
      formData.append('type', type);

      const uploadResponse = await fetch('/api/upload/company-files', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({})) as { error?: string };
        throw new Error(errorData.error || 'Upload failed');
      }

      const { url } = await uploadResponse.json() as { url: string };

      const updateData: Record<string, string> = {};
      if (type === 'logo') updateData.logo_url = url;
      if (type === 'signature') updateData.signature_url = url;
      if (type === 'passbook') updateData.passbook_url = url;

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
        <h2 className="text-xl font-semibold mb-4">
          {locale === 'zh' ? '我的公司' : 'My Companies'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => {
            const primaryName = company.name?.zh || company.name?.en || '';
            const secondaryName = company.name?.en && company.name?.zh !== company.name?.en ? company.name.en : '';
            const isSelected = selectedCompany?.id === company.id;
            const ariaLabel = `${locale === 'zh' ? '選擇公司' : 'Select company'}: ${primaryName}`;

            return (
              <div
                key={company.id}
                onClick={() => loadCompany(company.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    loadCompany(company.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={ariaLabel}
                aria-current={isSelected || undefined}
                className={`
                  p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                  ${isSelected
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50 hover:shadow-md'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {getImageUrl(company.logo_url) ? (
                    <Image
                      src={getImageUrl(company.logo_url)!}
                      alt=""
                      width={48}
                      height={48}
                      className="rounded-full object-cover flex-shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xl text-gray-500" aria-hidden="true">🏢</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-semibold text-gray-900 truncate">
                      {primaryName}
                    </div>
                    {company.tax_id && (
                      <div className="text-sm font-normal text-gray-600 mt-0.5">
                        ({locale === 'zh' ? '統編' : 'Tax ID'}: {company.tax_id})
                      </div>
                    )}
                    {secondaryName && (
                      <div className="text-sm font-normal text-gray-500 mt-1 truncate">
                        {secondaryName}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
                  {(getImageUrl(selectedCompany.logo_url) || pendingFiles.logo) && (
                    <Image
                      src={pendingFiles.logo ? URL.createObjectURL(pendingFiles.logo) : getImageUrl(selectedCompany.logo_url)!}
                      alt="Logo"
                      width={128}
                      height={128}
                      className="object-cover mb-2 rounded"
                      unoptimized
                    />
                  )}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'logo')}
                    disabled={uploading.logo}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('logo-upload')?.click()}
                    disabled={uploading.logo}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading.logo ? (locale === 'zh' ? '上傳中...' : 'Uploading...') : (locale === 'zh' ? '選擇檔案' : 'Choose File')}
                  </button>
                </div>

                {/* Signature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === 'zh' ? '負責人簽名' : 'Signature'}
                  </label>
                  {(getImageUrl(selectedCompany.signature_url) || pendingFiles.signature) && (
                    <Image
                      src={pendingFiles.signature ? URL.createObjectURL(pendingFiles.signature) : getImageUrl(selectedCompany.signature_url)!}
                      alt="Signature"
                      width={128}
                      height={128}
                      className="object-cover mb-2 rounded"
                      unoptimized
                    />
                  )}
                  <input
                    id="signature-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'signature')}
                    disabled={uploading.signature}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('signature-upload')?.click()}
                    disabled={uploading.signature}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading.signature ? (locale === 'zh' ? '上傳中...' : 'Uploading...') : (locale === 'zh' ? '選擇檔案' : 'Choose File')}
                  </button>
                </div>

                {/* Passbook */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {locale === 'zh' ? '存摺封面' : 'Passbook'}
                  </label>
                  {(getImageUrl(selectedCompany.passbook_url) || pendingFiles.passbook) && (
                    <Image
                      src={pendingFiles.passbook ? URL.createObjectURL(pendingFiles.passbook) : getImageUrl(selectedCompany.passbook_url)!}
                      alt="Passbook"
                      width={128}
                      height={128}
                      className="object-cover mb-2 rounded"
                      unoptimized
                    />
                  )}
                  <input
                    id="passbook-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'passbook')}
                    disabled={uploading.passbook}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('passbook-upload')?.click()}
                    disabled={uploading.passbook}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {uploading.passbook ? (locale === 'zh' ? '上傳中...' : 'Uploading...') : (locale === 'zh' ? '選擇檔案' : 'Choose File')}
                  </button>
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
              {saving ? (locale === 'zh' ? '保存中...' : 'Saving...') : (locale === 'zh' ? '保存' : 'Save')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
