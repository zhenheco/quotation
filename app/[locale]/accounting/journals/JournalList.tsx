'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { toast } from 'sonner'
import { useJournals, usePostJournal } from '@/hooks/accounting'
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
  const postJournal = usePostJournal()

  // 過帳傳票
  const handlePost = async (id: string) => {
    if (!confirm(t('accounting.confirmPost'))) return

    try {
      await postJournal.mutateAsync(id)
      toast.success(t('accounting.postSuccess'))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('accounting.postFailed')
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
    const statusMap: Record<string, string> = {
      DRAFT: 'draft',
      POSTED: 'posted',
      VOIDED: 'voided',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {t(`accounting.status.${statusMap[status] || status.toLowerCase()}`)}
      </Badge>
    )
  }

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<string, string> = {
      MANUAL: 'manual',
      INVOICE: 'invoice',
      BANK: 'bank',
      ADJUSTMENT: 'adjustment',
    }
    return (
      <Badge variant="secondary">
        {t(`accounting.journalSource.${sourceMap[source] || source.toLowerCase()}`)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 傳票列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.journals.title')}</CardTitle>
          <CardDescription>{t('accounting.journals.totalRecords', { total })}</CardDescription>
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
                  <TableHead>{t('accounting.journals.journalNumber')}</TableHead>
                  <TableHead>{t('accounting.journals.date')}</TableHead>
                  <TableHead>{t('accounting.journals.description')}</TableHead>
                  <TableHead>{t('accounting.journals.source')}</TableHead>
                  <TableHead className="text-center">{t('accounting.journals.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
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
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${locale}/accounting/journals/${journal.id}`}>
                            {t('common.view')}
                          </Link>
                        </Button>
                        {journal.status === 'DRAFT' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/${locale}/accounting/journals/${journal.id}/edit`}>
                              {t('common.edit')}
                            </Link>
                          </Button>
                        )}
                        {journal.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => handlePost(journal.id)}
                            disabled={postJournal.isPending}
                          >
                            {t('accounting.post')}
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
            {t('pagination.showing', { shown: journals.length, total })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={journals.length < 20}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
