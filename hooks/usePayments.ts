'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  Payment,
  CollectedPaymentRecord,
  UnpaidPaymentRecord,
  PaymentType,
  PaymentMethod,
  PaymentFrequency,
} from '@/types/extended.types'

interface UseCollectedPaymentsReturn {
  payments: CollectedPaymentRecord[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useCollectedPayments(): UseCollectedPaymentsReturn {
  const [payments, setPayments] = useState<CollectedPaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments/collected')
      if (!response.ok) {
        throw new Error('Failed to fetch collected payments')
      }
      const data = await response.json()
      setPayments(data.payments || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return {
    payments,
    loading,
    error,
    refresh: fetchPayments,
  }
}

interface UseUnpaidPaymentsReturn {
  payments: UnpaidPaymentRecord[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useUnpaidPayments(): UseUnpaidPaymentsReturn {
  const [payments, setPayments] = useState<UnpaidPaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments/unpaid')
      if (!response.ok) {
        throw new Error('Failed to fetch unpaid payments')
      }
      const data = await response.json()
      setPayments(data.payments || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  return {
    payments,
    loading,
    error,
    refresh: fetchPayments,
  }
}

interface RecordPaymentParams {
  contract_id?: string
  quotation_id?: string
  customer_id: string
  payment_type: PaymentType
  payment_date: string
  amount: number
  currency: string
  payment_frequency?: PaymentFrequency
  payment_method?: PaymentMethod
  reference_number?: string
  notes?: string
}

export async function recordPayment(params: RecordPaymentParams): Promise<Payment> {
  const response = await fetch('/api/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to record payment')
  }

  const data = await response.json()
  return data.payment
}

export async function markPaymentAsOverdue(paymentId: string): Promise<void> {
  const response = await fetch(`/api/payments/${paymentId}/mark-overdue`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to mark payment as overdue')
  }
}

interface PaymentStatistics {
  current_month: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  current_year: {
    total_collected: number
    total_pending: number
    total_overdue: number
    currency: string
  }
  overdue: {
    count: number
    total_amount: number
    average_days: number
  }
}

interface UsePaymentStatisticsReturn {
  statistics: PaymentStatistics | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function usePaymentStatistics(): UsePaymentStatisticsReturn {
  const [statistics, setStatistics] = useState<PaymentStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments/statistics')
      if (!response.ok) {
        throw new Error('Failed to fetch payment statistics')
      }
      const data = await response.json()
      setStatistics(data.statistics)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  return {
    statistics,
    loading,
    error,
    refresh: fetchStatistics,
  }
}
