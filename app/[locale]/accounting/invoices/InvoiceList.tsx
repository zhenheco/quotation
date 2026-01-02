'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { toast } from 'sonner'
import { useInvoices, useVerifyInvoice, usePostInvoice } from '@/hooks/accounting'
import { useCompany } from '@/hooks/useCompany'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface InvoiceListProps {
  locale: string
}

/**
 * 金額格式化
 */
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

export default function InvoiceList({ locale }: InvoiceListProps) {
  const t = useTranslations()
  const { company } = useCompany()
  const [page, setPage] = useState(1)
  const verifyInvoice = useVerifyInvoice()
  const postInvoice = usePostInvoice()

  // 審核發票
  const handleVerify = async (id: string) => {
    if (!confirm(t('accounting.confirmVerify'))) return

    try {
      await verifyInvoice.mutateAsync(id)
      toast.success(t('accounting.verifySuccess'))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('accounting.verifyFailed')
      toast.error(message)
    }
  }

  // 過帳發票
  const handlePost = async (id: string) => {
    if (!confirm(t('accounting.confirmPost'))) return

    try {
      await postInvoice.mutateAsync(id)
      toast.success(t('accounting.postSuccess'))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('accounting.postFailed')
      toast.error(message)
    }
  }

  const { data, isLoading, error } = useInvoices(
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

  const invoices = data?.invoices || []
  const total = data?.total || 0

  const getTypeBadge = (type: string) => {
    if (type === 'OUTPUT') {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          {t('accounting.invoiceTypes.output')}
        </Badge>
      )
    }
    return (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
        {t('accounting.invoiceTypes.input')}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'outline' | 'secondary' | 'default' | 'destructive'> = {
      DRAFT: 'outline',
      VERIFIED: 'secondary',
      POSTED: 'default',
      VOIDED: 'destructive',
    }
    const statusMap: Record<string, string> = {
      DRAFT: 'draft',
      VERIFIED: 'verified',
      POSTED: 'posted',
      VOIDED: 'voided',
    }
    return (
      <Badge variant={variants[status] || 'outline'}>
        {t(`accounting.status.${statusMap[status] || status.toLowerCase()}`)}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string) => {
    const statusMap: Record<string, string> = {
      UNPAID: 'unpaid',
      PARTIAL: 'partial',
      PAID: 'paid',
      OVERDUE: 'overdue',
    }
    const className = status === 'PAID' ? 'bg-green-100 text-green-800' :
                      status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'OVERDUE' ? 'bg-red-100 text-red-800' : ''
    return (
      <Badge variant="outline" className={className}>
        {t(`accounting.paymentStatus.${statusMap[status] || status.toLowerCase()}`)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* 發票列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.invoices.title')}</CardTitle>
          <CardDescription>{t('accounting.invoices.totalRecords', { total })}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.invoices.invoiceNumber')}</TableHead>
                  <TableHead>{t('accounting.invoices.type')}</TableHead>
                  <TableHead>{t('accounting.invoices.date')}</TableHead>
                  <TableHead>{t('accounting.invoices.counterparty')}</TableHead>
                  <TableHead className="text-right">{t('accounting.invoices.amount')}</TableHead>
                  <TableHead className="text-center">{t('accounting.invoices.status')}</TableHead>
                  <TableHead className="text-center">{t('accounting.invoices.payment')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/accounting/invoices/${invoice.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(invoice.type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString('zh-TW')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {invoice.counterparty_name || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={invoice.type === 'OUTPUT' ? 'text-green-600' : 'text-red-600'}>
                        {formatAmount(invoice.total_amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPaymentBadge(invoice.payment_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${locale}/accounting/invoices/${invoice.id}`}>
                            {t('common.view')}
                          </Link>
                        </Button>
                        {invoice.status !== 'VOIDED' && (
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/${locale}/accounting/invoices/${invoice.id}/edit`}>
                              {t('common.edit')}
                            </Link>
                          </Button>
                        )}
                        {invoice.status === 'DRAFT' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleVerify(invoice.id)}
                            disabled={verifyInvoice.isPending}
                          >
                            {t('accounting.verify')}
                          </Button>
                        )}
                        {invoice.status === 'VERIFIED' && (
                          <Button
                            size="sm"
                            onClick={() => handlePost(invoice.id)}
                            disabled={postInvoice.isPending}
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
            {t('pagination.showing', { shown: invoices.length, total })}
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
              disabled={invoices.length < 20}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
