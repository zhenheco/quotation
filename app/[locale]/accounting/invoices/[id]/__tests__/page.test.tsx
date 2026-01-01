/**
 * 發票詳情頁面測試
 * TDD: 先寫測試，再寫實作
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({ id: 'test-invoice-id', locale: 'zh' }),
}))

// 測試用假資料
const mockInvoice = {
  id: 'test-invoice-id',
  number: 'AB12345678',
  type: 'OUTPUT',
  date: '2024-12-01',
  untaxed_amount: 50000,
  tax_amount: 2500,
  total_amount: 52500,
  counterparty_name: '科技創新股份有限公司',
  counterparty_tax_id: '12345678',
  description: '軟體開發服務費',
  status: 'POSTED',
  payment_status: 'UNPAID',
  account_code: '4111',
  paid_amount: 0,
  created_at: '2024-12-01T00:00:00Z',
}

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should show loading state while fetching', async () => {
    // Arrange: Mock useInvoice 為 loading 狀態
    vi.doMock('@/hooks/accounting', () => ({
      useInvoice: () => ({
        data: undefined,
        isLoading: true,
        error: null,
      }),
    }))

    // Act: 動態載入元件
    const { default: InvoiceDetailClient } = await import('../InvoiceDetailClient')
    render(<InvoiceDetailClient invoiceId="test-invoice-id" locale="zh" />)

    // Assert: 應該顯示載入狀態
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('should render invoice details correctly', async () => {
    // Arrange: Mock useInvoice 返回發票資料
    vi.doMock('@/hooks/accounting', () => ({
      useInvoice: () => ({
        data: mockInvoice,
        isLoading: false,
        error: null,
      }),
    }))

    // Act
    const { default: InvoiceDetailClient } = await import('../InvoiceDetailClient')
    render(<InvoiceDetailClient invoiceId="test-invoice-id" locale="zh" />)

    // Assert: 應該顯示發票資訊
    await waitFor(() => {
      expect(screen.getByText('AB12345678')).toBeInTheDocument()
      expect(screen.getByText('科技創新股份有限公司')).toBeInTheDocument()
      expect(screen.getByText('軟體開發服務費')).toBeInTheDocument()
    })
  })

  it('should handle invoice not found', async () => {
    // Arrange: Mock useInvoice 返回錯誤
    vi.doMock('@/hooks/accounting', () => ({
      useInvoice: () => ({
        data: null,
        isLoading: false,
        error: new Error('Invoice not found'),
      }),
    }))

    // Act
    const { default: InvoiceDetailClient } = await import('../InvoiceDetailClient')
    render(<InvoiceDetailClient invoiceId="non-existent-id" locale="zh" />)

    // Assert: 應該顯示錯誤訊息
    await waitFor(() => {
      expect(screen.getByText(/common.error/i)).toBeInTheDocument()
    })
  })

  it('should display correct invoice type badge for OUTPUT', async () => {
    // Arrange
    vi.doMock('@/hooks/accounting', () => ({
      useInvoice: () => ({
        data: { ...mockInvoice, type: 'OUTPUT' },
        isLoading: false,
        error: null,
      }),
    }))

    // Act
    const { default: InvoiceDetailClient } = await import('../InvoiceDetailClient')
    render(<InvoiceDetailClient invoiceId="test-invoice-id" locale="zh" />)

    // Assert: 應該顯示銷項發票標籤
    await waitFor(() => {
      expect(screen.getByText('accounting.invoiceTypes.output')).toBeInTheDocument()
    })
  })

  it('should display correct invoice type badge for INPUT', async () => {
    // Arrange
    vi.doMock('@/hooks/accounting', () => ({
      useInvoice: () => ({
        data: { ...mockInvoice, type: 'INPUT' },
        isLoading: false,
        error: null,
      }),
    }))

    // Act
    const { default: InvoiceDetailClient } = await import('../InvoiceDetailClient')
    render(<InvoiceDetailClient invoiceId="test-invoice-id" locale="zh" />)

    // Assert: 應該顯示進項發票標籤
    await waitFor(() => {
      expect(screen.getByText('accounting.invoiceTypes.input')).toBeInTheDocument()
    })
  })

  it('should display amount labels', async () => {
    // Arrange
    vi.doMock('@/hooks/accounting', () => ({
      useInvoice: () => ({
        data: mockInvoice,
        isLoading: false,
        error: null,
      }),
    }))

    // Act
    const { default: InvoiceDetailClient } = await import('../InvoiceDetailClient')
    render(<InvoiceDetailClient invoiceId="test-invoice-id" locale="zh" />)

    // Assert: 應該顯示金額相關標籤
    await waitFor(() => {
      expect(screen.getByText('accounting.invoices.amountDetails')).toBeInTheDocument()
      expect(screen.getByText('accounting.invoices.untaxedAmount')).toBeInTheDocument()
      expect(screen.getByText('accounting.invoices.taxAmount')).toBeInTheDocument()
      expect(screen.getByText('accounting.invoices.totalAmount')).toBeInTheDocument()
    })
  })
})
