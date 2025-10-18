/**
 * RoleSelector 組件
 *
 * 角色選擇器，用於選擇使用者角色
 */

'use client';

import { useState, useEffect } from 'react';
import type { RoleName } from '@/types/extended.types';

// 定義可選的角色
export const AVAILABLE_ROLES: Array<{
  name: RoleName;
  label: string;
  level: number;
  description: string;
}> = [
  {
    name: 'company_owner',
    label: '公司負責人',
    level: 2,
    description: '擁有公司的完整管理權限'
  },
  {
    name: 'sales_manager',
    label: '業務經理',
    level: 3,
    description: '管理業務團隊和報價單'
  },
  {
    name: 'salesperson',
    label: '業務人員',
    level: 4,
    description: '建立和管理客戶及報價單'
  },
  {
    name: 'accountant',
    label: '會計人員',
    level: 5,
    description: '管理合約和付款記錄'
  }
];

interface RoleSelectorProps {
  /** 當前選中的角色 */
  value?: RoleName;
  /** 選擇變更時的回調 */
  onChange: (roleName: RoleName) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自訂樣式類別 */
  className?: string;
  /** placeholder 文字 */
  placeholder?: string;
  /** 是否排除超級管理員角色 */
  excludeSuperAdmin?: boolean;
  /** 是否排除公司負責人角色 */
  excludeOwner?: boolean;
  /** 是否顯示角色描述 */
  showDescription?: boolean;
}

export function RoleSelector({
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = '選擇角色...',
  excludeSuperAdmin = true, // 預設排除超管
  excludeOwner = false,
  showDescription = true
}: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<RoleName | ''>(value || '');

  // 當 value prop 改變時更新內部狀態
  useEffect(() => {
    if (value !== undefined) {
      setSelectedRole(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as RoleName;
    setSelectedRole(newRole);
    onChange(newRole);
  };

  // 過濾可用角色
  const availableRoles = AVAILABLE_ROLES.filter(role => {
    if (excludeOwner && role.name === 'company_owner') return false;
    return true;
  });

  // 取得當前選中角色的描述
  const selectedRoleInfo = AVAILABLE_ROLES.find(r => r.name === selectedRole);

  return (
    <div className="flex flex-col space-y-2">
      <select
        value={selectedRole}
        onChange={handleChange}
        disabled={disabled}
        className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
        } ${className}`}
      >
        {!selectedRole && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {availableRoles.map(role => (
          <option key={role.name} value={role.name}>
            {role.label}
          </option>
        ))}
      </select>
      {showDescription && selectedRoleInfo && (
        <p className="text-sm text-gray-500">
          {selectedRoleInfo.description}
        </p>
      )}
    </div>
  );
}

/**
 * RoleSelectorWithLabel - 帶標籤的角色選擇器
 */
export function RoleSelectorWithLabel({
  label = '選擇角色',
  ...props
}: RoleSelectorProps & { label?: string }) {
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <RoleSelector {...props} />
    </div>
  );
}

/**
 * RoleBadge - 角色徽章組件
 */
export function RoleBadge({ role }: { role: RoleName }) {
  const roleInfo = AVAILABLE_ROLES.find(r => r.name === role);

  if (!roleInfo) {
    return <span className="text-gray-500">{role}</span>;
  }

  // 根據角色等級設定顏色
  const colorClass = {
    2: 'bg-purple-100 text-purple-800', // Owner
    3: 'bg-blue-100 text-blue-800',     // Sales Manager
    4: 'bg-green-100 text-green-800',   // Salesperson
    5: 'bg-yellow-100 text-yellow-800'  // Accountant
  }[roleInfo.level] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {roleInfo.label}
    </span>
  );
}
