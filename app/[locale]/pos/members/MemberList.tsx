'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useMembers } from '@/hooks/pos'
import { useTenant } from '@/hooks/useTenant'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface MemberListProps {
  locale: string
}

// 簡易金額格式化
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function MemberList({ locale }: MemberListProps) {
  const t = useTranslations()
  const { tenant } = useTenant()
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const limit = 20

  const { data: members, isLoading, error } = useMembers(
    {
      tenantId: tenant?.id || '',
      search: search || undefined,
      limit,
      offset,
    },
    !!tenant?.id
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        {t('common.error')}: {error.message}
      </div>
    )
  }

  const memberList = members || []

  const getLevelBadge = (levelName: string | null | undefined) => {
    if (!levelName) return null
    const colors: Record<string, string> = {
      '一般會員': 'bg-gray-100 text-gray-800',
      '銀卡會員': 'bg-slate-200 text-slate-800',
      '金卡會員': 'bg-yellow-100 text-yellow-800',
      '白金會員': 'bg-purple-100 text-purple-800',
      '鑽石會員': 'bg-blue-100 text-blue-800',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[levelName] || 'bg-gray-100'}`}>
        {levelName}
      </span>
    )
  }

  return (
    <div>
      {/* 搜尋框 */}
      <div className="p-4 border-b">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋會員姓名或電話..."
          className="w-full max-w-md px-4 py-2 border rounded-lg"
        />
      </div>

      {/* 列表 */}
      {memberList.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          {t('common.noData')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  會員編號
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  電話
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  會員等級
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  儲值餘額
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  點數
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {memberList.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/${locale}/pos/members/${member.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {member.member_no}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getLevelBadge(member.level?.name)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                    {formatAmount(member.balance)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600">
                    {(member.points || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/${locale}/pos/members/${member.id}`}
                      className="text-gray-600 hover:text-gray-900 mr-4"
                    >
                      {t('common.view')}
                    </Link>
                    <Link
                      href={`/${locale}/pos/members/${member.id}/deposit`}
                      className="text-green-600 hover:text-green-800"
                    >
                      儲值
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分頁 */}
      {memberList.length >= limit && (
        <div className="px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-500">
            顯示第 {offset + 1} 到 {offset + memberList.length} 筆
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一頁
            </button>
            <button
              onClick={() => setOffset((o) => o + limit)}
              disabled={memberList.length < limit}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一頁
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
