'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useCanViewCost } from '@/hooks/usePermission'
import PermissionGuard from './PermissionGuard'

interface ProductCostDisplayProps {
  costPrice: number | null
  costCurrency: string | null
  basePrice: number
  currency: string
  showCalculations?: boolean
}

export default function ProductCostDisplay({
  costPrice,
  costCurrency,
  basePrice,
  currency,
  showCalculations = false,
}: ProductCostDisplayProps) {
  const t = useTranslations()
  const { hasPermission, loading } = useCanViewCost()

  // Calculate profit if cost is available
  const profitAmount = costPrice && costCurrency === currency ? basePrice - costPrice : null
  const profitMargin = profitAmount && costPrice ? ((profitAmount / costPrice) * 100) : null

  return (
    <PermissionGuard hasPermission={hasPermission} loading={loading}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('product.cost_price')}</span>
          <span className="font-medium">
            {costPrice ? `${costPrice.toLocaleString()} ${costCurrency || currency}` : '-'}
          </span>
        </div>

        {showCalculations && profitAmount !== null && profitMargin !== null && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('product.profit_amount')}</span>
              <span className={`font-medium ${profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitAmount.toLocaleString()} {currency}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{t('product.profit_margin')}</span>
              <span className={`font-semibold ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}%
              </span>
            </div>
          </>
        )}
      </div>
    </PermissionGuard>
  )
}
