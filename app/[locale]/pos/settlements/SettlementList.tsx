'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSettlements } from '@/hooks/pos'
import { useTenant } from '@/hooks/useTenant'
import { formatAmount } from '@/lib/utils/formatters'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SettlementListProps {
  locale: string
}

export default function SettlementList({ locale }: SettlementListProps) {
  const t = useTranslations()
  const { activeBranch } = useTenant()
  const [offset, setOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const limit = 20

  // 取得最近 30 天
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)

  const { data, isLoading, error } = useSettlements(
    {
      branchId: activeBranch?.id || '',
      status: statusFilter as 'PENDING' | 'COUNTING' | 'VARIANCE' | 'APPROVED' | 'LOCKED' | undefined,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      pageSize: limit,
      page: Math.floor(offset / limit) + 1,
    },
    !!activeBranch?.id
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

  const settlements = data?.settlements || []

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'outline' | 'secondary' | 'default' | 'destructive' | 'warning'> = {
      PENDING: 'default',
      COUNTING: 'warning',
      VARIANCE: 'destructive',
      APPROVED: 'secondary',
      LOCKED: 'outline',
    }
    const statusKeyMap: Record<string, string> = {
      PENDING: 'pending',
      COUNTING: 'counting',
      VARIANCE: 'variance',
      APPROVED: 'approved',
      LOCKED: 'locked',
    }
    const className = status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                      status === 'COUNTING' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'VARIANCE' ? 'bg-orange-100 text-orange-800' :
                      status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      status === 'LOCKED' ? 'bg-gray-100 text-gray-800' : ''
    return (
      <Badge variant={variants[status] || 'outline'} className={className}>
        {t(`pos.settlements.settlementStatus.${statusKeyMap[status] || status.toLowerCase()}`)}
      </Badge>
    )
  }

  const getDifferenceDisplay = (difference: number) => {
    if (difference === 0) {
      return <span className="text-muted-foreground">-</span>
    }
    const prefix = difference > 0 ? '+' : ''
    const colorClass = difference > 0 ? 'text-green-600' : 'text-red-600'
    return (
      <span className={`font-medium ${colorClass}`}>
        {prefix}{formatAmount(difference)}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* 篩選器 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">{t('pos.settlements.filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={t('pos.settlements.status')}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">{t('pos.settlements.allStatus')}</option>
              <option value="PENDING">{t('pos.settlements.settlementStatus.pending')}</option>
              <option value="COUNTING">{t('pos.settlements.settlementStatus.counting')}</option>
              <option value="VARIANCE">{t('pos.settlements.settlementStatus.variance')}</option>
              <option value="APPROVED">{t('pos.settlements.settlementStatus.approved')}</option>
              <option value="LOCKED">{t('pos.settlements.settlementStatus.locked')}</option>
            </select>
            <Button variant="outline" size="sm">
              {t('pos.settlements.createSettlement')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日結帳列表 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pos.settlements.title')}</CardTitle>
          <CardDescription>{t('pos.settlements.recentDays', { days: 30 })}</CardDescription>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {t('common.noData')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pos.settlements.settlementDate')}</TableHead>
                  <TableHead className="text-right">{t('pos.settlements.totalSales')}</TableHead>
                  <TableHead className="text-right">{t('pos.settlements.expectedCash')}</TableHead>
                  <TableHead className="text-right">{t('pos.settlements.actualCash')}</TableHead>
                  <TableHead className="text-right">{t('pos.settlements.difference')}</TableHead>
                  <TableHead className="text-center">{t('pos.settlements.status')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => {
                  const actualCash = settlement.actual_cash || 0
                  const expectedCash = settlement.expected_cash || 0
                  const difference = actualCash - expectedCash
                  return (
                    <TableRow key={settlement.id}>
                      <TableCell>
                        <Link
                          href={`/${locale}/pos/settlements/${settlement.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {new Date(settlement.settlement_date).toLocaleDateString('zh-TW')}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatAmount(settlement.total_sales)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatAmount(expectedCash)}
                      </TableCell>
                      <TableCell className="text-right">
                        {settlement.actual_cash != null
                          ? formatAmount(actualCash)
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {settlement.actual_cash != null
                          ? getDifferenceDisplay(difference)
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(settlement.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${locale}/pos/settlements/${settlement.id}`}>
                            {t('common.view')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 分頁 */}
      {settlements.length >= limit && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {t('pos.settlements.showingRange', { start: offset + 1, end: offset + settlements.length })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              disabled={offset === 0}
            >
              {t('pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset((o) => o + limit)}
              disabled={settlements.length < limit}
            >
              {t('pagination.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
