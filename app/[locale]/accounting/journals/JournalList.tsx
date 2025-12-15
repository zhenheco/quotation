'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useJournals } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface JournalListProps {
  locale: string
}

export default function JournalList({ locale }: JournalListProps) {
  const t = useTranslations()
  const { company } = useCompany()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading, error } = useJournals(
    {
      companyId: company?.id || '',
      status: statusFilter as 'DRAFT' | 'POSTED' | 'VOIDED' | undefined,
      page,
      pageSize: 20,
    },
    !!company?.id
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

  const journals = data?.journals || []
  const total = data?.total || 0

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
      DRAFT: 'outline',
      POSTED: 'default',
      VOIDED: 'destructive',
    }
    const labels: Record<string, string> = {
      DRAFT: '草稿',
      POSTED: '已過帳',
      VOIDED: '已作廢',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    )
  }

  const getSourceBadge = (source: string) => {
    const labels: Record<string, string> = {
      MANUAL: '手動輸入',
      INVOICE: '發票',
      BANK: '銀行對帳',
      ADJUSTMENT: '調整',
    }
    return (
      <Badge variant="secondary">
        {labels[source] || source}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 篩選器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">篩選條件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">全部狀態</option>
              <option value="DRAFT">草稿</option>
              <option value="POSTED">已過帳</option>
              <option value="VOIDED">已作廢</option>
            </select>
            <Button variant="outline" size="sm">
              新增傳票
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 傳票列表 */}
      <Card>
        <CardHeader>
          <CardTitle>會計傳票</CardTitle>
          <CardDescription>共 {total} 筆傳票記錄</CardDescription>
        </CardHeader>
        <CardContent>
          {journals.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>傳票編號</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead>來源</TableHead>
                  <TableHead className="text-center">狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {journals.map((journal) => (
                  <TableRow key={journal.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/accounting/journals/${journal.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {journal.journal_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(journal.date).toLocaleDateString('zh-TW')}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {journal.description || '-'}
                    </TableCell>
                    <TableCell>
                      {getSourceBadge(journal.source_type)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(journal.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/accounting/journals/${journal.id}`}>
                          {t('common.view')}
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
      {total > 20 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            顯示 {journals.length} 筆，共 {total} 筆
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              上一頁
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={journals.length < 20}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
