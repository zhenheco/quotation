'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useMembers } from '@/hooks/pos'
import { useTenant } from '@/hooks/useTenant'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface MemberListProps {
  locale: string
}

/**
 * 金額格式化
 */
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function MemberList({ locale }: MemberListProps) {
  const t = useTranslations()
  const { tenant } = useTenant()
  const [offset, setOffset] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const limit = 20

  const { data, isLoading, error } = useMembers(
    {
      tenantId: tenant?.id || '',
      search: searchTerm || undefined,
      limit,
      offset,
    },
    !!tenant?.id
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          {t('common.error')}: {error.message}
        </CardContent>
      </Card>
    )
  }

  const members = data || []
  const total = members.length

  const getLevelBadge = (levelName: string | undefined) => {
    if (!levelName) {
      return <Badge variant="outline">一般會員</Badge>
    }
    const colorMap: Record<string, string> = {
      'VIP': 'bg-purple-100 text-purple-800',
      'VVIP': 'bg-amber-100 text-amber-800',
      '金卡': 'bg-yellow-100 text-yellow-800',
      '銀卡': 'bg-gray-100 text-gray-800',
    }
    return (
      <Badge variant="secondary" className={colorMap[levelName] || ''}>
        {levelName}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>會員總數</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>本月新增</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">-</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>總儲值餘額</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">-</div>
          </CardContent>
        </Card>
      </div>

      {/* 篩選器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">搜尋會員</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="搜尋姓名、電話、編號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button variant="outline" size="sm">
              新增會員
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 會員列表 */}
      <Card>
        <CardHeader>
          <CardTitle>會員列表</CardTitle>
          <CardDescription>共 {total} 位會員</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>會員編號</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>電話</TableHead>
                  <TableHead>等級</TableHead>
                  <TableHead className="text-right">儲值餘額</TableHead>
                  <TableHead className="text-right">點數</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/pos/members/${member.id}`}
                        className="font-mono text-primary hover:underline"
                      >
                        {member.member_no}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.phone || '-'}
                    </TableCell>
                    <TableCell>
                      {getLevelBadge(member.level?.name)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={member.balance && member.balance > 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                        {formatAmount(member.balance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={member.points && member.points > 0 ? 'text-purple-600 font-medium' : 'text-muted-foreground'}>
                        {member.points?.toLocaleString() || '0'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/pos/members/${member.id}`}>
                          {t('common.view')}
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="text-green-600 hover:text-green-700">
                        <Link href={`/${locale}/pos/members/${member.id}/deposit`}>
                          儲值
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 分頁 */}
      {members.length >= limit && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            顯示第 {offset + 1} 到 {offset + members.length} 筆
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => o + limit)}
              disabled={members.length < limit}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
