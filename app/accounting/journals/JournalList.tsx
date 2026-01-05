'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useJournals, usePostJournal } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function JournalList() {
  const { company } = useCompany()
  const [page, setPage] = useState(1)
  const postJournal = usePostJournal()

  // 過帳傳票
  const handlePost = async (id: string) => {
    if (!confirm('確定要過帳此傳票嗎？')) return

    try {
      await postJournal.mutateAsync(id)
      toast.success('過帳成功')
    } catch (err) {
      const message = err instanceof Error ? err.message : '過帳失敗'
      toast.error(message)
    }
  }

  const { data, isLoading, error } = useJournals(
    {
      companyId: company?.id || '',
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
          錯誤: {error.message}
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
    const statusMap: Record<string, string> = {
      DRAFT: '草稿',
      POSTED: '已過帳',
      VOIDED: '已作廢',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {statusMap[status] || status}
      </Badge>
    )
  }

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<string, string> = {
      MANUAL: '手動',
      INVOICE: '發票',
      BANK: '銀行',
      ADJUSTMENT: '調整',
    }
    return (
      <Badge variant="secondary">
        {sourceMap[source] || source}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 傳票列表 */}
      <Card>
        <CardHeader>
          <CardTitle>日記帳</CardTitle>
          <CardDescription>共 {total} 筆記錄</CardDescription>
        </CardHeader>
        <CardContent>
          {journals.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              沒有資料
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
                        href={`/accounting/journals/${journal.id}`}
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
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/accounting/journals/${journal.id}`}>
                            檢視
                          </Link>
                        </Button>
                        {journal.status === 'DRAFT' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/accounting/journals/${journal.id}/edit`}>
                              編輯
                            </Link>
                          </Button>
                        )}
                        {journal.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => handlePost(journal.id)}
                            disabled={postJournal.isPending}
                          >
                            過帳
                          </Button>
                        )}
                      </div>
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
