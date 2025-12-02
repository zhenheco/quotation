'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import Image from 'next/image'
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
  logo_url?: string
}

interface CompanyWithStats extends Company {
  member_count: number
}

interface CurrentUser {
  id: string
  is_owner: boolean
  role_name?: string
}

function getImageUrl(url: string | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/api/')) return url
  if (url.includes('supabase.co/storage')) {
    const match = url.match(/company-files\/(.+)$/)
    if (match) {
      return `/api/storage/company-files?path=${encodeURIComponent(match[1])}`
    }
  }
  return url
}

export default function TeamSettingsPage() {
  const t = useTranslations('team')
  const locale = useLocale()

  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members')
  const [companies, setCompanies] = useState<CompanyWithStats[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await apiGet<Company[]>('/api/companies')

      const companiesWithStats = await Promise.all(
        data.map(async (company) => {
          try {
            const members = await apiGet<Member[]>(`/api/companies/${company.id}/members`)
            const activeMembers = members.filter(m => m.is_active)
            return { ...company, member_count: activeMembers.length }
          } catch {
            return { ...company, member_count: 0 }
          }
        })
      )

      setCompanies(companiesWithStats)

      const storedCompanyId = localStorage.getItem('selectedCompanyId')
      const validId = storedCompanyId && companiesWithStats.some((c) => c.id === storedCompanyId)

      if (companiesWithStats.length === 1) {
        setSelectedCompanyId(companiesWithStats[0].id)
        localStorage.setItem('selectedCompanyId', companiesWithStats[0].id)
      } else if (validId) {
        setSelectedCompanyId(storedCompanyId)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
    } finally {
      setLoading(false)
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

    setLoadingMembers(true)
    try {
      const data = await apiGet<Member[]>(`/api/companies/${selectedCompanyId}/members`)

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
      setLoadingMembers(false)
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

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompanyId(companyId)
    localStorage.setItem('selectedCompanyId', companyId)
  }

  const canManageInvitations = currentUser?.is_owner || currentUser?.role_name === 'sales_manager'

  if (loading) {
    return (
      <>
        <PageHeader
          title={t('title')}
          description={t('description')}
        />
        <div className="flex justify-center py-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <div className="space-y-6">
        {/* 公司卡片列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            {locale === 'zh' ? '選擇公司' : 'Select Company'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => {
              const primaryName = company.name?.zh || company.name?.en || ''
              const secondaryName = company.name?.en && company.name?.zh !== company.name?.en ? company.name.en : ''
              const isSelected = selectedCompanyId === company.id

              return (
                <div
                  key={company.id}
                  onClick={() => handleCompanySelect(company.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleCompanySelect(company.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${locale === 'zh' ? '選擇公司' : 'Select company'}: ${primaryName}`}
                  aria-current={isSelected || undefined}
                  className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                    ${isSelected
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50 hover:shadow-md'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {getImageUrl(company.logo_url) ? (
                      <Image
                        src={getImageUrl(company.logo_url)!}
                        alt=""
                        width={48}
                        height={48}
                        className="rounded-full object-cover flex-shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl text-gray-500" aria-hidden="true">🏢</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-semibold text-gray-900 truncate">
                        {primaryName}
                      </div>
                      {secondaryName && (
                        <div className="text-sm font-normal text-gray-500 mt-0.5 truncate">
                          {secondaryName}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 mt-1">
                        {locale === 'zh'
                          ? `${company.member_count} 位成員`
                          : `${company.member_count} member${company.member_count !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 選中公司的成員管理 */}
        {selectedCompanyId && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {companies.find(c => c.id === selectedCompanyId)?.name?.[locale === 'zh' ? 'zh' : 'en'] || ''}
              {' - '}
              {locale === 'zh' ? '成員管理' : 'Member Management'}
            </h2>

            {/* Tab 切換 */}
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
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
            {loadingMembers ? (
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
        )}

        {/* 提示用戶選擇公司 */}
        {!selectedCompanyId && companies.length > 1 && (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <div className="text-gray-500">
              {locale === 'zh' ? '請選擇一家公司以查看成員' : 'Please select a company to view members'}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
