'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import PageHeader from '@/components/ui/PageHeader'
import TeamMemberList from '@/components/team/TeamMemberList'
import InviteLinkSection from '@/components/team/InviteLinkSection'
import { apiGet } from '@/lib/api-client'

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

interface Company {
  id: string
  name: { zh: string; en: string }
}

interface CurrentUser {
  id: string
  is_owner: boolean
  role_name?: string
}

export default function TeamSettingsPage() {
  const t = useTranslations('team')
  const locale = useLocale()

  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiGet<Company[]>('/api/companies')
      setCompanies(data)

      const storedCompanyId = localStorage.getItem('selectedCompanyId')
      const validId = storedCompanyId && data.some((c) => c.id === storedCompanyId)

      if (validId) {
        setSelectedCompanyId(storedCompanyId)
      } else if (data.length > 0) {
        setSelectedCompanyId(data[0].id)
        localStorage.setItem('selectedCompanyId', data[0].id)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    }
  }, [])

  const fetchRoles = useCallback(async () => {
    try {
      const data = await apiGet<Role[]>('/api/roles')
      setRoles(data)
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }, [])

  const fetchMembers = useCallback(async () => {
    if (!selectedCompanyId) return

    setLoading(true)
    try {
      const data = await apiGet<Member[]>(`/api/companies/${selectedCompanyId}/members`)

      // 取得每個成員的 user profile
      const membersWithProfiles = await Promise.all(
        data.map(async (member) => {
          try {
            const profile = await apiGet<{ full_name: string; display_name: string; email?: string }>(
              `/api/users/${member.user_id}/profile`
            )
            return { ...member, user_profile: profile }
          } catch {
            return member
          }
        })
      )

      setMembers(membersWithProfiles.filter((m) => m.is_active))

      // 找到當前用戶
      const me = await apiGet<{ id: string }>('/api/auth/me')
      const myMembership = membersWithProfiles.find((m) => m.user_id === me.id)
      if (myMembership) {
        setCurrentUser({
          id: me.id,
          is_owner: myMembership.is_owner,
          role_name: myMembership.role_name,
        })
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCompanyId])

  useEffect(() => {
    fetchCompanies()
    fetchRoles()
  }, [fetchCompanies, fetchRoles])

  useEffect(() => {
    if (selectedCompanyId) {
      fetchMembers()
    }
  }, [selectedCompanyId, fetchMembers])

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId)
    localStorage.setItem('selectedCompanyId', companyId)
  }

  const canManageInvitations = currentUser?.is_owner || currentUser?.role_name === 'sales_manager'

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        backLink={`/${locale}/settings`}
      />

      <div className="space-y-6">
        {/* 公司選擇器 */}
        {companies.length > 1 && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('selectCompany')}
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {locale === 'zh' ? company.name.zh : company.name.en}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tab 切換 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setActiveTab('members')}
              className={`border-b-2 pb-4 text-sm font-medium ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {t('members')} ({members.length})
            </button>
            {canManageInvitations && (
              <button
                onClick={() => setActiveTab('invitations')}
                className={`border-b-2 pb-4 text-sm font-medium ${
                  activeTab === 'invitations'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {t('invitations')}
              </button>
            )}
          </nav>
        </div>

        {/* 內容區 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === 'members' && currentUser && (
              <TeamMemberList
                companyId={selectedCompanyId}
                members={members}
                roles={roles}
                currentUserId={currentUser.id}
                isOwner={currentUser.is_owner}
                locale={locale}
                onMemberUpdated={fetchMembers}
              />
            )}
            {activeTab === 'invitations' && (
              <InviteLinkSection
                companyId={selectedCompanyId}
                roles={roles}
                locale={locale}
                canManage={canManageInvitations ?? false}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}
