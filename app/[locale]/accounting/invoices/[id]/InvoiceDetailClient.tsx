'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useInvoice, useVerifyInvoice, usePostInvoice } from '@/hooks/accounting'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface InvoiceDetailClientProps {
  invoiceId: string
  locale: string
}

/**
 * 金額格式化
 */
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
}

/**
 * 發票詳情客戶端元件
 */
export default function InvoiceDetailClient({ invoiceId, locale }: InvoiceDetailClientProps) {
  const t = useTranslations()
  const router = useRouter()
  const { data: invoice, isLoading, error } = useInvoice(invoiceId)
  const verifyInvoice = useVerifyInvoice()
  const postInvoice = usePostInvoice()

  // 審核發票
  const handleVerify = async () => {
    if (!confirm(t('accounting.confirmVerify'))) return

    try {
      await verifyInvoice.mutateAsync(invoiceId)
      toast.success(t('accounting.verifySuccess'))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('accounting.verifyFailed')
      toast.error(message)
    }
  }

  // 過帳發票
  const handlePost = async () => {
    if (!confirm(t('accounting.confirmPost'))) return

    try {
      await postInvoice.mutateAsync(invoiceId)
      toast.success(t('accounting.postSuccess'))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('accounting.postFailed')
      toast.error(message)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <LoadingSpinner data-testid="loading-spinner" />
        </CardContent>
      </Card>
    )
  }

  if (error || !invoice) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          {t('common.error')}: {error?.message || t('common.notFound')}
        </CardContent>
      </Card>
    )
  }

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
      {/* 標頭與操作按鈕 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.back()}>
          ← {t('common.back')}
        </Button>
        <div className="flex gap-2">
          {/* 編輯按鈕（非作廢狀態） */}
          {invoice.status !== 'VOIDED' && (
            <Button variant="outline" asChild>
              <Link href={`/${locale}/accounting/invoices/${invoiceId}/edit`}>
                {t('accounting.invoices.edit')}
              </Link>
            </Button>
          )}
          {/* 審核按鈕（草稿狀態） */}
          {invoice.status === 'DRAFT' && (
            <Button
              variant="secondary"
              onClick={handleVerify}
              disabled={verifyInvoice.isPending}
            >
              {verifyInvoice.isPending ? t('common.loading') : t('accounting.verify')}
            </Button>
          )}
          {/* 過帳按鈕（已審核狀態） */}
          {invoice.status === 'VERIFIED' && (
            <Button
              onClick={handlePost}
              disabled={postInvoice.isPending}
            >
              {postInvoice.isPending ? t('common.loading') : t('accounting.post')}
            </Button>
          )}
        </div>
      </div>

      {/* 發票基本資訊 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{invoice.number}</CardTitle>
              <CardDescription>
                {new Date(invoice.date).toLocaleDateString('zh-TW')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {getTypeBadge(invoice.type)}
              {getStatusBadge(invoice.status)}
              {getPaymentBadge(invoice.payment_status)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 交易對象 */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t('accounting.invoices.counterparty')}
              </h3>
              <p className="font-medium">{invoice.counterparty_name || '-'}</p>
              {invoice.counterparty_tax_id && (
                <p className="text-sm text-muted-foreground">
                  {t('accounting.invoices.taxId')}: {invoice.counterparty_tax_id}
                </p>
              )}
            </div>

            {/* 會計科目 */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t('accounting.invoices.accountCode')}
              </h3>
              <p className="font-medium">
                {invoice.account_code || '-'}
                {invoice.is_account_automatic && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    AI
                  </Badge>
                )}
              </p>
              {invoice.account_confidence && (
                <p className="text-sm text-muted-foreground">
                  {t('accounting.invoices.confidence')}: {Math.round(invoice.account_confidence * 100)}%
                </p>
              )}
            </div>

            {/* 描述 */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {t('accounting.invoices.description')}
              </h3>
              <p>{invoice.description || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 金額明細 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.invoices.amountDetails')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('accounting.invoices.untaxedAmount')}</span>
              <span className="font-medium">{formatAmount(invoice.untaxed_amount)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">{t('accounting.invoices.taxAmount')}</span>
              <span className="font-medium">{formatAmount(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between py-2 text-lg">
              <span className="font-medium">{t('accounting.invoices.totalAmount')}</span>
              <span className={`font-bold ${invoice.type === 'OUTPUT' ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(invoice.total_amount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 付款資訊 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.invoices.paymentInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t('accounting.invoices.paymentStatus')}
              </h3>
              {getPaymentBadge(invoice.payment_status)}
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t('accounting.invoices.paidAmount')}
              </h3>
              <p className="font-medium">{formatAmount(invoice.paid_amount)}</p>
            </div>
            {invoice.due_date && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  {t('accounting.invoices.dueDate')}
                </h3>
                <p className="font-medium">
                  {new Date(invoice.due_date).toLocaleDateString('zh-TW')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 傳票連結 */}
      {invoice.journal_entry_id && (
        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.invoices.relatedJournal')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={`/${locale}/accounting/journals/${invoice.journal_entry_id}`}>
                {t('accounting.invoices.viewJournal')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
