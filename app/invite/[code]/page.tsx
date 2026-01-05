'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiGet, apiPost } from '@/lib/api-client'

interface InvitationInfo {
  valid: boolean
  error?: string
  company?: {
    id: string
    name: { zh: string; en: string }
  }
  role?: {
    id: string
    name: string
    display_name: { zh: string; en: string }
  }
}

interface AcceptResult {
  success: boolean
  company_id?: string
  error?: string
}

export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const validateInvitation = async () => {
      try {
        // 檢查是否已登入
        const authResponse = await fetch('/api/auth/me')
        setIsLoggedIn(authResponse.ok)

        // 驗證邀請碼
        const info = await apiGet<InvitationInfo>(`/api/invitations/${code}`)
        setInvitationInfo(info)
      } catch (error) {
        console.error('Error validating invitation:', error)
        setInvitationInfo({ valid: false, error: 'VALIDATION_FAILED' })
      } finally {
        setLoading(false)
      }
    }

    if (code) {
      validateInvitation()
    }
  }, [code])

  const handleAcceptInvitation = async () => {
    setAccepting(true)
    try {
      const result = await apiPost<AcceptResult>(`/api/invitations/${code}/accept`, {})

      if (result.success) {
        toast.success('成功加入公司！')

        // 設定選中的公司
        if (result.company_id) {
          localStorage.setItem('selectedCompanyId', result.company_id)
        }

        // 導向 dashboard
        router.push('/dashboard')
      } else {
        const errorMessage = getErrorMessage(result.error)
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('加入失敗，請稍後再試')
    } finally {
      setAccepting(false)
    }
  }

  const handleLoginRedirect = () => {
    // 儲存邀請碼到 localStorage，登入後自動回來
    localStorage.setItem('pendingInviteCode', code)
    router.push(`/login?redirect=/invite/${code}`)
  }

  const getErrorMessage = (error?: string) => {
    switch (error) {
      case 'INVITATION_NOT_FOUND':
        return '找不到此邀請連結'
      case 'INVITATION_REVOKED':
        return '邀請已被撤銷'
      case 'INVITATION_EXPIRED':
        return '邀請已過期'
      case 'INVITATION_MAX_USES_REACHED':
        return '邀請已達使用上限'
      case 'ALREADY_MEMBER':
        return '您已經是公司成員'
      default:
        return '邀請驗證失敗'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!invitationInfo?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 text-5xl">❌</div>
          <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            無效的邀請
          </h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {getErrorMessage(invitationInfo?.error)}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            登入
          </button>
        </div>
      </div>
    )
  }

  const companyName = invitationInfo.company?.name.zh || invitationInfo.company?.name.en || ''
  const roleName = invitationInfo.role?.display_name.zh || invitationInfo.role?.display_name.en || ''

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            您被邀請加入
          </h1>
          <p className="text-lg font-medium text-blue-600 dark:text-blue-400">{companyName}</p>
        </div>

        <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">指派角色</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{roleName}</span>
          </div>
        </div>

        {isLoggedIn ? (
          <button
            onClick={handleAcceptInvitation}
            disabled={accepting}
            className="w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {accepting ? '加入中...' : '接受邀請'}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              請先登入以接受邀請
            </p>
            <button
              onClick={handleLoginRedirect}
              className="w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              登入
            </button>
            <button
              onClick={() => router.push(`/register?redirect=/invite/${code}`)}
              className="w-full rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              註冊
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
