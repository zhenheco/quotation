/**
 * CompanySelector 組件
 *
 * 公司選擇器，用於切換不同公司
 */

'use client';

import { useState, useCallback } from 'react';
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
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // 計算選中的公司 ID：優先使用 prop，否則自動選第一個
  let selectedCompanyId = value ?? '';
  if (!selectedCompanyId && !loading && companies.length > 0) {
    selectedCompanyId = companies[0].company_id;
    // 自動選擇第一個公司（僅觸發一次）
    if (!hasAutoSelected) {
      setHasAutoSelected(true);
      // 在下一個 microtask 觸發 onChange，避免 render 中呼叫父元件的 setState
      Promise.resolve().then(() => onChange(selectedCompanyId));
    }
  }

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  }, [onChange]);

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
