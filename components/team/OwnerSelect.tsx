'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { apiGet } from '@/lib/api-client'

interface Member {
  id: string
  company_id: string
  user_id: string
  role_id: string | null
  role_name?: string
  is_owner: boolean
  is_active: boolean
  user_profile?: {
    full_name: string
    display_name: string
    avatar_url?: string
    email?: string
  }
}

interface OwnerSelectProps {
  companyId: string
  value: string | null
  onChange: (ownerId: string) => void
  disabled?: boolean
  className?: string
}

export default function OwnerSelect({
  companyId,
  value,
  onChange,
  disabled = false,
  className = '',
}: OwnerSelectProps) {
  const t = useTranslations('team')
  const locale = useLocale()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      if (!companyId) {
        setMembers([])
        setLoading(false)
        return
      }

      try {
        const data = await apiGet<Member[]>(`/api/companies/${companyId}/members`)
        const activeMembers = data.filter((m) => m.is_active)

        const membersWithProfiles = await Promise.all(
          activeMembers.map(async (member) => {
            try {
              const profile = await apiGet<{
                full_name: string
                display_name: string
                email?: string
              }>(`/api/users/${member.user_id}/profile`)
              return { ...member, user_profile: profile }
            } catch {
              return member
            }
          })
        )

        setMembers(membersWithProfiles)
      } catch (error) {
        console.error('Error fetching members:', error)
        setMembers([])
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [companyId])

  const getDisplayName = (member: Member): string => {
    if (member.user_profile) {
      return member.user_profile.display_name || member.user_profile.full_name
    }
    return member.user_id.slice(0, 8)
  }

  const getRoleBadge = (member: Member): string => {
    if (member.is_owner) {
      return locale === 'zh' ? '擁有者' : 'Owner'
    }
    if (member.role_name === 'sales_manager') {
      return locale === 'zh' ? '經理' : 'Manager'
    }
    if (member.role_name === 'salesperson') {
      return locale === 'zh' ? '業務' : 'Sales'
    }
    if (member.role_name === 'accountant') {
      return locale === 'zh' ? '會計' : 'Accountant'
    }
    return ''
  }

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 rounded-md bg-gray-200 dark:bg-gray-700" />
      </div>
    )
  }

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 ${className}`}
    >
      <option value="">{t('selectOwner')}</option>
      {members.map((member) => (
        <option key={member.user_id} value={member.user_id}>
          {getDisplayName(member)}
          {getRoleBadge(member) && ` (${getRoleBadge(member)})`}
        </option>
      ))}
    </select>
  )
}
