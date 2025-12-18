'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useInvoices } from '@/hooks/accounting'
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
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data, isLoading, error } = useInvoices(
    {
      companyId: company?.id || '',
      type: typeFilter as 'OUTPUT' | 'INPUT' | undefined,
      status: statusFilter as 'DRAFT' | 'VERIFIED' | 'POSTED' | 'VOIDED' | undefined,
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
      {/* 篩選器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('accounting.invoices.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">{t('accounting.invoices.allTypes')}</option>
              <option value="OUTPUT">{t('accounting.invoiceTypes.output')}</option>
              <option value="INPUT">{t('accounting.invoiceTypes.input')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">{t('accounting.invoices.allStatus')}</option>
              <option value="DRAFT">{t('accounting.status.draft')}</option>
              <option value="VERIFIED">{t('accounting.status.verified')}</option>
              <option value="POSTED">{t('accounting.status.posted')}</option>
              <option value="VOIDED">{t('accounting.status.voided')}</option>
            </select>
            <Button variant="outline" size="sm">
              {t('accounting.invoices.addNew')}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/${locale}/accounting/invoices/${invoice.id}`}>
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
