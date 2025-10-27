import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/dashboard-stats
 *
 * 取得完整的儀表板統計數據
 * 包含報價單、合約、付款、客戶、產品等統計
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 並行查詢所有統計數據
    const [
      quotationsResult,
      contractsResult,
      paymentsResult,
      customersResult,
      productsResult,
      overdueContractsResult,
    ] = await Promise.all([
      // 報價單統計
      supabase
        .from('quotations')
        .select('status, total_amount')
        .eq('user_id', user.id),

      // 合約統計
      supabase
        .from('customer_contracts')
        .select('status, end_date, next_collection_date')
        .eq('user_id', user.id),

      // 付款統計
      supabase.rpc('get_payment_statistics'),

      // 客戶統計
      supabase
        .from('customers')
        .select('id, is_active')
        .eq('user_id', user.id),

      // 產品統計
      supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id),

      // 逾期合約
      supabase
        .from('customer_contracts')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .lt('next_collection_date', new Date().toISOString()),
    ])

    // 處理報價單統計
    const quotations = quotationsResult.data || []
    const quotationStats = {
      draft: quotations.filter((q) => q.status === 'draft').length,
      sent: quotations.filter((q) => q.status === 'sent').length,
      accepted: quotations.filter((q) => q.status === 'accepted').length,
      rejected: quotations.filter((q) => q.status === 'rejected').length,
      total: quotations.length,
    }

    // 處理合約統計
    const contracts = contractsResult.data || []
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const contractStats = {
      active: contracts.filter((c) => c.status === 'active').length,
      overdue: overdueContractsResult.data?.length || 0,
      expiring_soon: contracts.filter((c) => {
        const endDate = new Date(c.end_date)
        return c.status === 'active' && endDate >= now && endDate <= thirtyDaysLater
      }).length,
      total: contracts.length,
    }

    // 處理付款統計
    const paymentStats = paymentsResult.data || {
      current_month: { total_collected: 0, total_pending: 0, total_overdue: 0, currency: 'TWD' },
      current_year: { total_collected: 0, total_pending: 0, total_overdue: 0, currency: 'TWD' },
      overdue: { count: 0, total_amount: 0, average_days: 0 },
    }

    const payments = {
      current_month_collected: paymentStats.current_month?.total_collected || 0,
      current_year_collected: paymentStats.current_year?.total_collected || 0,
      total_unpaid: paymentStats.current_year?.total_pending || 0,
      total_overdue: paymentStats.current_year?.total_overdue || 0,
      currency: paymentStats.current_month?.currency || 'TWD',
    }

    // 處理客戶統計
    const customers = customersResult.data || []
    const customerStats = {
      total: customers.length,
      active: customers.filter((c) => c.is_active).length,
    }

    // 處理產品統計
    const products = productsResult.data || []
    const productStats = {
      total: products.length,
    }

    return NextResponse.json({
      data: {
        quotations: quotationStats,
        contracts: contractStats,
        payments,
        customers: customerStats,
        products: productStats,
      },
    })
  } catch (error: any) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
