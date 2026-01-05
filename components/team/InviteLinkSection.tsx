'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { apiGet, apiPost, apiDelete } from '@/lib/api-client'
import type { CompanyInvitationWithDetails, CreateInvitationResponse } from '@/types/invitation.types'

interface Role {
  id: string
  name: string
  display_name: { zh: string; en: string }
}

interface InviteLinkSectionProps {
  companyId: string
  roles: Role[]
  canManage: boolean
}

export default function InviteLinkSection({
  companyId,
  roles,
  canManage,
}: InviteLinkSectionProps) {
  const [invitations, setInvitations] = useState<CompanyInvitationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '')
  const [maxUses, setMaxUses] = useState<number>(1)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchInvitations = async () => {
    try {
      const data = await apiGet<CompanyInvitationWithDetails[]>(`/api/companies/${companyId}/invitations`)
      setInvitations(data)
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  useState(() => {
    fetchInvitations()
  })

  const handleCreateInvitation = async () => {
    if (!selectedRoleId) {
      toast.error('請先選擇角色')
      return
    }

    setCreating(true)
    try {
      const result = await apiPost<CreateInvitationResponse>(`/api/companies/${companyId}/invitations`, {
        role_id: selectedRoleId,
        max_uses: maxUses,
        expires_in_days: 7,
      })

      await navigator.clipboard.writeText(result.invite_url)
      toast.success('邀請連結已建立並複製到剪貼簿')
      setShowCreateForm(false)
      fetchInvitations()
    } catch (error) {
      console.error('Error creating invitation:', error)
      toast.error('建立邀請連結失敗')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = async (code: string) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quote24.cc'
    const url = `${appUrl}/invite/${code}`
    await navigator.clipboard.writeText(url)
    toast.success('連結已複製')
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await apiDelete(`/api/companies/${companyId}/invitations/${invitationId}`)
      toast.success('邀請已撤銷')
      fetchInvitations()
    } catch (error) {
      console.error('Error revoking invitation:', error)
      toast.error('撤銷邀請失敗')
    }
  }

  const getStatusBadge = (invitation: CompanyInvitationWithDetails) => {
    if (!invitation.is_active) {
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          已撤銷
        </span>
      )
    }

    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    if (now > expiresAt) {
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600 dark:bg-red-900 dark:text-red-300">
          已過期
        </span>
      )
    }

    if (invitation.used_count >= invitation.max_uses) {
      return (
        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300">
          已用完
        </span>
      )
    }

    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600 dark:bg-green-900 dark:text-green-300">
        有效
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getRoleDisplayName = (role: CompanyInvitationWithDetails['role']) => {
    if (!role) return '-'
    return role.display_name.zh
  }

  if (!canManage) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">您沒有管理邀請的權限</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 建立邀請連結 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">邀請連結</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          產生連結
        </button>
      </div>

      {showCreateForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                指派角色
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.display_name.zh}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                使用次數上限
              </label>
              <select
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
              >
                <option value={1}>單次使用</option>
                <option value={5}>5 次</option>
                <option value={10}>10 次</option>
                <option value={100}>無限制</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateInvitation}
                disabled={creating}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? '建立中...' : '建立並複製'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 邀請連結列表 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">尚無邀請連結</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  狀態
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  角色
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  使用次數
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                  到期時間
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {invitations.map((invitation) => {
                const isUsable =
                  invitation.is_active &&
                  new Date() < new Date(invitation.expires_at) &&
                  invitation.used_count < invitation.max_uses

                return (
                  <tr key={invitation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3">{getStatusBadge(invitation)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {getRoleDisplayName(invitation.role)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {invitation.used_count} / {invitation.max_uses}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(invitation.expires_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isUsable && (
                          <button
                            onClick={() => handleCopyLink(invitation.invite_code)}
                            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            複製連結
                          </button>
                        )}
                        {invitation.is_active && (
                          <button
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            className="text-sm text-red-600 hover:text-red-800 dark:text-red-400"
                          >
                            撤銷
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
