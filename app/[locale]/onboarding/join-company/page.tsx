'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

export default function JoinCompanyPage() {
  const t = useTranslations('onboarding')
  const tTeam = useTranslations('team')
  const locale = useLocale()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          setIsLoggedIn(true)
          const pendingCode = localStorage.getItem('pendingInviteCode')
          if (pendingCode) {
            setInviteCode(pendingCode)
            localStorage.removeItem('pendingInviteCode')
          }
        } else {
          router.push(`/${locale}/login`)
        }
      } catch {
        router.push(`/${locale}/login`)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [locale, router])

  const handleValidate = async () => {
    if (!inviteCode.trim()) {
      toast.error(t('inviteCodeRequired'))
      return
    }

    setValidating(true)
    setInvitationInfo(null)

    try {
      const info = await apiGet<InvitationInfo>(`/api/invitations/${inviteCode.trim()}`)
      setInvitationInfo(info)
      if (!info.valid) {
        toast.error(getErrorMessage(info.error))
      }
    } catch (error) {
      console.error('Error validating invitation:', error)
      setInvitationInfo({ valid: false, error: 'VALIDATION_FAILED' })
      toast.error(t('validationFailed'))
    } finally {
      setValidating(false)
    }
  }

  const handleAccept = async () => {
    if (!invitationInfo?.valid) return

    setAccepting(true)
    try {
      const result = await apiPost<AcceptResult>(`/api/invitations/${inviteCode.trim()}/accept`, {})

      if (result.success) {
        if (result.company_id) {
          localStorage.setItem('selectedCompanyId', result.company_id)
        }
        toast.success(tTeam('joinSuccess'))
        router.push(`/${locale}/dashboard`)
      } else {
        toast.error(getErrorMessage(result.error))
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error(tTeam('joinFailed'))
    } finally {
      setAccepting(false)
    }
  }

  const getErrorMessage = (error?: string) => {
    switch (error) {
      case 'INVITATION_NOT_FOUND':
        return tTeam('invitationNotFound')
      case 'INVITATION_REVOKED':
        return tTeam('invitationRevoked')
      case 'INVITATION_EXPIRED':
        return tTeam('invitationExpired')
      case 'INVITATION_MAX_USES_REACHED':
        return tTeam('invitationMaxUsesReached')
      case 'ALREADY_MEMBER':
        return tTeam('alreadyMember')
      default:
        return tTeam('invitationError')
    }
  }

  const companyName = invitationInfo?.company
    ? locale === 'zh'
      ? invitationInfo.company.name.zh
      : invitationInfo.company.name.en
    : ''

  const roleName = invitationInfo?.role
    ? locale === 'zh'
      ? invitationInfo.role.display_name.zh
      : invitationInfo.role.display_name.en
    : ''

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6">
          <Link
            href={`/${locale}/onboarding`}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('back')}
          </Link>
        </div>

        <div className="mb-8 text-center">
          <div className="mb-4 text-5xl">🔗</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('joinCompanyTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('joinCompanySubtitle')}
          </p>
        </div>

        {!invitationInfo?.valid ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('inviteCode')}
              </label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder={t('inviteCodePlaceholder')}
              />
            </div>

            <button
              onClick={handleValidate}
              disabled={validating || !inviteCode.trim()}
              className="w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {validating ? t('validating') : t('validateCode')}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <div className="mb-2 text-center text-sm font-medium text-green-800 dark:text-green-200">
                {t('validInvitation')}
              </div>
              <div className="text-center text-lg font-bold text-gray-900 dark:text-gray-100">
                {companyName}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{tTeam('assignedRole')}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{roleName}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setInvitationInfo(null)
                  setInviteCode('')
                }}
                className="flex-1 rounded-lg border border-gray-300 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {accepting ? tTeam('joining') : t('confirmJoin')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
