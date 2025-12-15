'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSettlements } from '@/hooks/pos'
import { useTenant } from '@/hooks/useTenant'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SettlementListProps {
  locale: string
}

/**
 * 金額格式化
 */
function formatAmount(amount: number | null | undefined): string {
  return `NT$ ${(amount || 0).toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`
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
    const labels: Record<string, string> = {
      PENDING: '待處理',
      COUNTING: '點算中',
      VARIANCE: '有差異',
      APPROVED: '已核准',
      LOCKED: '已鎖定',
    }
    const className = status === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                      status === 'COUNTING' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'VARIANCE' ? 'bg-orange-100 text-orange-800' :
                      status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      status === 'LOCKED' ? 'bg-gray-100 text-gray-800' : ''
    return (
      <Badge variant={variants[status] || 'outline'} className={className}>
        {labels[status] || status}
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
              <option value="PENDING">待處理</option>
              <option value="COUNTING">點算中</option>
              <option value="VARIANCE">有差異</option>
              <option value="APPROVED">已核准</option>
              <option value="LOCKED">已鎖定</option>
            </select>
            <Button variant="outline" size="sm">
              建立日結帳
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 日結帳列表 */}
      <Card>
        <CardHeader>
          <CardTitle>日結帳記錄</CardTitle>
          <CardDescription>最近 30 天的日結帳</CardDescription>
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
                  <TableHead>結帳日期</TableHead>
                  <TableHead className="text-right">營業額</TableHead>
                  <TableHead className="text-right">應收現金</TableHead>
                  <TableHead className="text-right">實收現金</TableHead>
                  <TableHead className="text-right">差額</TableHead>
                  <TableHead className="text-center">狀態</TableHead>
                  <TableHead className="text-right">操作</TableHead>
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
            顯示第 {offset + 1} 到 {offset + settlements.length} 筆
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
              disabled={settlements.length < limit}
            >
              下一頁
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
