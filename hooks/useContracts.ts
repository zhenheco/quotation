'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  CustomerContract,
  CustomerContractWithCustomer,
  ContractPaymentProgress,
  ContractStatus,
} from '@/types/extended.types'

interface UseContractsReturn {
  contracts: CustomerContractWithCustomer[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useContracts(): UseContractsReturn {
  const [contracts, setContracts] = useState<CustomerContractWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contracts')
      if (!response.ok) {
        throw new Error('Failed to fetch contracts')
      }
      const data = await response.json()
      setContracts(data.contracts || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  return {
    contracts,
    loading,
    error,
    refresh: fetchContracts,
  }
}

interface UseContractDetailReturn {
  contract: CustomerContractWithCustomer | null
  progress: ContractPaymentProgress | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useContractDetail(contractId: string): UseContractDetailReturn {
  const [contract, setContract] = useState<CustomerContractWithCustomer | null>(null)
  const [progress, setProgress] = useState<ContractPaymentProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchContractDetail = useCallback(async () => {
    if (!contractId) return

    try {
      setLoading(true)

      const [contractRes, progressRes] = await Promise.all([
        fetch(`/api/contracts/${contractId}`),
        fetch(`/api/contracts/${contractId}/payment-progress`),
      ])

      if (!contractRes.ok || !progressRes.ok) {
        throw new Error('Failed to fetch contract details')
      }

      const contractData = await contractRes.json()
      const progressData = await progressRes.json()

      setContract(contractData.contract)
      setProgress(progressData.progress)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [contractId])

  useEffect(() => {
    fetchContractDetail()
  }, [fetchContractDetail])

  return {
    contract,
    progress,
    loading,
    error,
    refresh: fetchContractDetail,
  }
}

interface UseOverdueContractsReturn {
  overdueContracts: CustomerContractWithCustomer[]
  loading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useOverdueContracts(): UseOverdueContractsReturn {
  const [overdueContracts, setOverdueContracts] = useState<CustomerContractWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchOverdueContracts = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contracts/overdue')
      if (!response.ok) {
        throw new Error('Failed to fetch overdue contracts')
      }
      const data = await response.json()
      setOverdueContracts(data.contracts || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverdueContracts()
  }, [fetchOverdueContracts])

  return {
    overdueContracts,
    loading,
    error,
    refresh: fetchOverdueContracts,
  }
}

interface CreateContractParams {
  quotation_id: string
  signed_date: string
  end_date: string
  payment_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual'
  next_collection_date: string
  next_collection_amount: number
}

export async function createContractFromQuotation(
  params: CreateContractParams
): Promise<CustomerContract> {
  const response = await fetch('/api/contracts/from-quotation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create contract')
  }

  const data = await response.json()
  return data.contract
}

export async function updateNextCollection(
  contractId: string,
  next_collection_date: string,
  next_collection_amount: number
): Promise<CustomerContract> {
  const response = await fetch(`/api/contracts/${contractId}/next-collection`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      next_collection_date,
      next_collection_amount,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to update next collection')
  }

  const data = await response.json()
  return data.contract
}
