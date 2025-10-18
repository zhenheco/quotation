/**
 * CompanySelector 組件
 *
 * 公司選擇器，用於切換不同公司
 */

'use client';

import { useState, useEffect } from 'react';
import { useCompanies } from '@/hooks/permission';

interface CompanySelectorProps {
  /** 當前選中的公司 ID */
  value?: string;
  /** 選擇變更時的回調 */
  onChange: (companyId: string) => void;
  /** 是否顯示載入中狀態 */
  showLoading?: boolean;
  /** 自訂樣式類別 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** placeholder 文字 */
  placeholder?: string;
}

export function CompanySelector({
  value,
  onChange,
  showLoading = true,
  className = '',
  disabled = false,
  placeholder = '選擇公司...'
}: CompanySelectorProps) {
  const { companies, loading, error } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState(value || '');

  // 當 value prop 改變時更新內部狀態
  useEffect(() => {
    if (value !== undefined) {
      setSelectedCompanyId(value);
    }
  }, [value]);

  // 當公司列表載入完成且沒有選中公司時，自動選擇第一個公司
  useEffect(() => {
    if (!loading && companies.length > 0 && !selectedCompanyId) {
      const firstCompanyId = companies[0].company_id;
      setSelectedCompanyId(firstCompanyId);
      onChange(firstCompanyId);
    }
  }, [loading, companies, selectedCompanyId, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCompanyId = e.target.value;
    setSelectedCompanyId(newCompanyId);
    onChange(newCompanyId);
  };

  if (loading && showLoading) {
    return (
      <select
        disabled
        className={`px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 ${className}`}
      >
        <option>載入中...</option>
      </select>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        載入公司列表失敗：{error.message}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-gray-500 text-sm">
        無可用公司
      </div>
    );
  }

  return (
    <select
      value={selectedCompanyId}
      onChange={handleChange}
      disabled={disabled}
      className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
        disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
      } ${className}`}
    >
      {!selectedCompanyId && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {companies.map(company => (
        <option key={company.company_id} value={company.company_id}>
          {company.company_name}
          {company.is_owner && ' (Owner)'}
        </option>
      ))}
    </select>
  );
}

/**
 * CompanySelectorWithLabel - 帶標籤的公司選擇器
 */
export function CompanySelectorWithLabel({
  label = '選擇公司',
  ...props
}: CompanySelectorProps & { label?: string }) {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <CompanySelector {...props} />
    </div>
  );
}
