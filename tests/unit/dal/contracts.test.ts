/**
 * 合約 DAL 單元測試
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getContracts,
  getContractById,
  createContract,
  getContractsWithOverduePayments,
  getContractPaymentProgress,
  generateContractNumber,
  updateContractNextCollection,
} from '@/lib/dal/contracts'
import {
  mockSupabaseClient,
  resetQueryBuilder,
  setQueryResult,
  createMockContract,
} from '../../mocks/supabase'

// Mock supabase-client
vi.mock('@/lib/db/supabase-client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  SupabaseClient: vi.fn(),
}))

describe('Contracts DAL', () => {
  const testUserId = 'test-user-id'
  const testContractId = 'test-contract-id'
  const testCompanyId = 'test-company-id'

  beforeEach(() => {
    vi.clearAllMocks()
    resetQueryBuilder()
  })

  describe('getContracts', () => {
    it('應返回合約列表', async () => {
      const mockContracts = [
        createMockContract({ id: '1' }),
        createMockContract({ id: '2' }),
      ]

      setQueryResult({
        data: mockContracts,
        error: null,
      })

      const result = await getContracts(mockSupabaseClient as never, testUserId)

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customer_contracts')
    })

    it('應支援 companyId 過濾', async () => {
      setQueryResult({
        data: [createMockContract()],
        error: null,
      })

      const result = await getContracts(mockSupabaseClient as never, testUserId, testCompanyId)

      expect(result).toBeDefined()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customer_contracts')
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getContracts(mockSupabaseClient as never, testUserId)
      ).rejects.toThrow('Failed to get contracts: Database error')
    })

    it('應返回空陣列當沒有資料', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      const result = await getContracts(mockSupabaseClient as never, testUserId)

      expect(result).toEqual([])
    })
  })

  describe('getContractById', () => {
    it('應返回指定合約', async () => {
      const mockContract = createMockContract()

      setQueryResult({
        data: mockContract,
        error: null,
      })

      const result = await getContractById(
        mockSupabaseClient as never,
        testUserId,
        testContractId
      )

      expect(result).toEqual(mockContract)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customer_contracts')
    })

    it('不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getContractById(
        mockSupabaseClient as never,
        testUserId,
        'non-existent-id'
      )

      expect(result).toBeNull()
    })

    it('其他錯誤時應拋出異常', async () => {
      setQueryResult({
        data: null,
        error: { code: 'OTHER', message: 'Unexpected error' },
      })

      await expect(
        getContractById(mockSupabaseClient as never, testUserId, testContractId)
      ).rejects.toThrow('Failed to get contract: Unexpected error')
    })
  })

  describe('createContract', () => {
    it('應創建新合約', async () => {
      const mockCreated = createMockContract()

      setQueryResult({
        data: mockCreated,
        error: null,
      })

      const result = await createContract(mockSupabaseClient as never, testUserId, {
        company_id: testCompanyId,
        customer_id: 'customer-123',
        quotation_id: 'quotation-123',
        contract_number: 'C2025-001',
        title: '測試合約',
        description: '合約描述',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        status: 'draft',
        total_amount: 100000,
        currency: 'TWD',
        payment_collected: 0,
      })

      expect(result).toEqual(mockCreated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customer_contracts')
    })

    it('創建失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Insert failed' },
      })

      await expect(
        createContract(mockSupabaseClient as never, testUserId, {
          company_id: testCompanyId,
          customer_id: 'customer-123',
          quotation_id: null,
          contract_number: 'C2025-001',
          title: '測試合約',
          description: null,
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          status: 'draft',
          total_amount: 100000,
          currency: 'TWD',
          payment_collected: 0,
        })
      ).rejects.toThrow('Failed to create contract: Insert failed')
    })
  })

  describe('getContractsWithOverduePayments', () => {
    it('應返回有逾期付款的合約', async () => {
      const mockContracts = [
        {
          ...createMockContract({ id: '1', status: 'active' }),
          customers: { name: { zh: '測試客戶', en: 'Test Customer' } },
          payment_schedules: [
            { id: 's1', amount: 10000, paid_amount: 0, due_date: '2025-01-01', status: 'overdue' },
          ],
        },
      ]

      setQueryResult({
        data: mockContracts,
        error: null,
      })

      const result = await getContractsWithOverduePayments(
        mockSupabaseClient as never,
        testUserId
      )

      expect(result).toHaveLength(1)
      expect(result[0].customer_name).toBe('測試客戶')
      expect(result[0].overdue_schedules_count).toBe(1)
      expect(result[0].total_overdue_amount).toBe(10000)
    })

    it('應處理字串格式的客戶名稱', async () => {
      const mockContracts = [
        {
          ...createMockContract({ id: '1', status: 'active' }),
          customers: { name: '直接字串名稱' },
          payment_schedules: [
            { id: 's1', amount: 5000, paid_amount: 0, due_date: '2025-01-01', status: 'overdue' },
          ],
        },
      ]

      setQueryResult({
        data: mockContracts,
        error: null,
      })

      const result = await getContractsWithOverduePayments(
        mockSupabaseClient as never,
        testUserId
      )

      expect(result[0].customer_name).toBe('直接字串名稱')
    })

    it('應處理 JSON 字串格式的客戶名稱', async () => {
      const mockContracts = [
        {
          ...createMockContract({ id: '1', status: 'active' }),
          customers: { name: JSON.stringify({ zh: 'JSON名稱', en: 'JSON Name' }) },
          payment_schedules: [
            { id: 's1', amount: 5000, paid_amount: 0, due_date: '2025-01-01', status: 'overdue' },
          ],
        },
      ]

      setQueryResult({
        data: mockContracts,
        error: null,
      })

      const result = await getContractsWithOverduePayments(
        mockSupabaseClient as never,
        testUserId
      )

      expect(result[0].customer_name).toBe('JSON名稱')
    })

    it('查詢失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Query failed' },
      })

      await expect(
        getContractsWithOverduePayments(mockSupabaseClient as never, testUserId)
      ).rejects.toThrow('Failed to get contracts with overdue payments: Query failed')
    })

    it('沒有資料時應返回空陣列', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      const result = await getContractsWithOverduePayments(
        mockSupabaseClient as never,
        testUserId
      )

      expect(result).toEqual([])
    })
  })

  describe('getContractPaymentProgress', () => {
    // 注意：此函數需要多次資料庫呼叫（取得合約 + 取得付款排程）
    // 由於簡化 mock 的限制，完整測試需要整合測試環境

    it('合約不存在時應返回 null', async () => {
      setQueryResult({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })

      const result = await getContractPaymentProgress(
        mockSupabaseClient as never,
        testUserId,
        'non-existent'
      )

      expect(result).toBeNull()
    })
  })

  describe('generateContractNumber', () => {
    it('應生成新合約編號（無現有合約）', async () => {
      setQueryResult({
        data: [],
        error: null,
      })

      const result = await generateContractNumber(
        mockSupabaseClient as never,
        testUserId
      )

      const year = new Date().getFullYear()
      expect(result).toBe(`C${year}-001`)
    })

    it('應根據最新編號遞增', async () => {
      const year = new Date().getFullYear()
      setQueryResult({
        data: [{ contract_number: `C${year}-005` }],
        error: null,
      })

      const result = await generateContractNumber(
        mockSupabaseClient as never,
        testUserId
      )

      expect(result).toBe(`C${year}-006`)
    })

    it('應處理空資料', async () => {
      setQueryResult({
        data: null,
        error: null,
      })

      const result = await generateContractNumber(
        mockSupabaseClient as never,
        testUserId
      )

      const year = new Date().getFullYear()
      expect(result).toBe(`C${year}-001`)
    })
  })

  describe('updateContractNextCollection', () => {
    it('應更新合約下次收款資訊', async () => {
      const mockUpdated = createMockContract()

      setQueryResult({
        data: mockUpdated,
        error: null,
      })

      const result = await updateContractNextCollection(
        mockSupabaseClient as never,
        testUserId,
        testContractId,
        {
          next_collection_date: '2025-02-01',
          next_collection_amount: 20000,
        }
      )

      expect(result).toEqual(mockUpdated)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customer_contracts')
    })

    it('更新失敗時應拋出錯誤', async () => {
      setQueryResult({
        data: null,
        error: { message: 'Update failed' },
      })

      await expect(
        updateContractNextCollection(
          mockSupabaseClient as never,
          testUserId,
          testContractId,
          {
            next_collection_date: '2025-02-01',
            next_collection_amount: 20000,
          }
        )
      ).rejects.toThrow('Failed to update contract: Update failed')
    })
  })
})
