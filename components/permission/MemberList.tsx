/**
 * MemberList 組件
 *
 * 顯示公司成員列表，包含編輯和刪除功能
 */

'use client';

import { useState } from 'react';
import { useCompanyMembers } from '@/hooks/permission';
import { RoleBadge, RoleSelector } from './RoleSelector';
import type { RoleName } from '@/types/extended.types';

interface MemberListProps {
  /** 公司 ID */
  companyId: string | null;
  /** 是否可以編輯成員 */
  canEdit?: boolean;
  /** 自訂樣式類別 */
  className?: string;
  /** 刪除成員時的確認訊息 */
  onDeleteConfirm?: (userId: string, userName: string) => Promise<boolean>;
}

export function MemberList({
  companyId,
  canEdit = false,
  className = '',
  onDeleteConfirm
}: MemberListProps) {
  const { members, loading, error, updateMemberRole, removeMember, refetch } = useCompanyMembers(companyId);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<RoleName | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // 開始編輯角色
  const handleStartEdit = (userId: string, currentRole: RoleName) => {
    setEditingUserId(userId);
    setNewRole(currentRole);
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setEditingUserId(null);
    setNewRole(null);
  };

  // 儲存角色變更
  const handleSaveRole = async (userId: string) => {
    if (!newRole) return;

    try {
      setProcessingUserId(userId);
      await updateMemberRole(userId, newRole);
      setEditingUserId(null);
      setNewRole(null);
      // 可以顯示成功訊息
    } catch (error) {
      console.error('更新角色失敗:', error);
      alert(error instanceof Error ? error.message : '更新角色失敗');
    } finally {
      setProcessingUserId(null);
    }
  };

  // 刪除成員
  const handleRemoveMember = async (userId: string, userName: string) => {
    // 如果有自訂確認函數，使用它
    if (onDeleteConfirm) {
      const confirmed = await onDeleteConfirm(userId, userName);
      if (!confirmed) return;
    } else {
      // 預設確認對話框
      if (!window.confirm(`確定要移除成員「${userName}」嗎？`)) {
        return;
      }
    }

    try {
      setProcessingUserId(userId);
      await removeMember(userId);
      // 可以顯示成功訊息
    } catch (error) {
      console.error('移除成員失敗:', error);
      alert(error instanceof Error ? error.message : '移除成員失敗');
    } finally {
      setProcessingUserId(null);
    }
  };

  if (!companyId) {
    return (
      <div className="text-gray-500 text-center py-8">
        請先選擇公司
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">載入中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center py-8">
        <p>載入成員列表失敗</p>
        <p className="text-sm mt-2">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          重試
        </button>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-gray-500 text-center py-8">
        此公司尚無成員
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              成員
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              角色
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              加入時間
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              狀態
            </th>
            {canEdit && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {members.map(member => (
            <tr key={member.user_id} className={!member.is_active ? 'opacity-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {member.display_name || member.full_name || '未設定名稱'}
                      {member.is_owner && (
                        <span className="ml-2 text-xs text-purple-600 font-semibold">Owner</span>
                      )}
                    </div>
                    {member.full_name && member.display_name !== member.full_name && (
                      <div className="text-sm text-gray-500">{member.full_name}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {member.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingUserId === member.user_id ? (
                  <RoleSelector
                    value={newRole || member.role_name}
                    onChange={setNewRole}
                    excludeOwner
                    showDescription={false}
                    className="w-full"
                  />
                ) : (
                  <RoleBadge role={member.role_name} />
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(member.joined_at).toLocaleDateString('zh-TW')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    member.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {member.is_active ? '啟用' : '停用'}
                </span>
              </td>
              {canEdit && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingUserId === member.user_id ? (
                    <div className="space-x-2">
                      <button
                        onClick={() => handleSaveRole(member.user_id)}
                        disabled={processingUserId === member.user_id || !newRole}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        儲存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={processingUserId === member.user_id}
                        className="text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <div className="space-x-2">
                      {!member.is_owner && (
                        <>
                          <button
                            onClick={() => handleStartEdit(member.user_id, member.role_name)}
                            disabled={processingUserId !== null}
                            className="text-purple-600 hover:text-purple-900 disabled:text-gray-400"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() =>
                              handleRemoveMember(
                                member.user_id,
                                member.display_name || member.full_name || member.email
                              )
                            }
                            disabled={processingUserId !== null}
                            className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                          >
                            移除
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
