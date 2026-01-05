'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import { apiPut, apiDelete } from '@/lib/api-client'

interface Role {
  id: string
  name: string
  display_name: { zh: string; en: string }
}

interface Member {
  id: string
  company_id: string
  user_id: string
  role_id: string | null
  role_name?: string
  is_owner: boolean
  is_active: boolean
  joined_at: string
  user_profile?: {
    full_name: string
    display_name: string
    avatar_url?: string
    email?: string
  }
}

interface TeamMemberListProps {
  companyId: string
  members: Member[]
  roles: Role[]
  currentUserId: string
  isOwner: boolean
  onMemberUpdated: () => void
}

export default function TeamMemberList({
  companyId,
  members,
  roles,
  currentUserId,
  isOwner,
  onMemberUpdated,
}: TeamMemberListProps) {
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null)

  const handleRoleChange = async (member: Member, newRoleId: string) => {
    if (!isOwner || member.is_owner) return

    setUpdatingRoleId(member.user_id)
    try {
      await apiPut(`/api/companies/${companyId}/members/${member.user_id}`, {
        role_id: newRoleId,
      })
      toast.success('角色已更新')
      onMemberUpdated()
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('更新角色失敗')
    } finally {
      setUpdatingRoleId(null)
    }
  }

  const handleRemoveMember = async (member: Member) => {
    try {
      await apiDelete(`/api/companies/${companyId}/members/${member.user_id}`)
      toast.success('成員已移除')
      onMemberUpdated()
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('移除成員失敗')
    } finally {
      setRemovingMemberId(null)
    }
  }

  const getRoleDisplayName = (roleName: string | undefined) => {
    if (!roleName) return '-'
    const role = roles.find((r) => r.name === roleName)
    if (role) {
      return role.display_name.zh
    }
    return roleName
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                成員
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                角色
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                加入日期
              </th>
              {isOwner && (
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                      {member.user_profile?.display_name?.[0]?.toUpperCase() ||
                        member.user_profile?.full_name?.[0]?.toUpperCase() ||
                        '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {member.user_profile?.display_name || member.user_profile?.full_name || '未知使用者'}
                        {member.is_owner && (
                          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            擁有者
                          </span>
                        )}
                        {member.user_id === currentUserId && (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            你
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {member.user_profile?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isOwner && !member.is_owner ? (
                    <select
                      value={member.role_id || ''}
                      onChange={(e) => handleRoleChange(member, e.target.value)}
                      disabled={updatingRoleId === member.user_id}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.display_name.zh}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-300">
                      {getRoleDisplayName(member.role_name)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(member.joined_at)}
                </td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    {!member.is_owner && member.user_id !== currentUserId && (
                      <button
                        onClick={() => setRemovingMemberId(member.user_id)}
                        className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        移除
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        isOpen={!!removingMemberId}
        onClose={() => setRemovingMemberId(null)}
        onConfirm={() => {
          const member = members.find((m) => m.user_id === removingMemberId)
          if (member) handleRemoveMember(member)
        }}
        title="確認移除成員"
        description="確定要移除此成員嗎？此操作無法復原。"
        confirmText="移除"
        cancelText="取消"
      />
    </div>
  )
}
