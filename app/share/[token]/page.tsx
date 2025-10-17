import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SharedQuotationView from './SharedQuotationView'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // 查詢分享令牌（使用 service role 繞過 RLS）
  const { data: shareToken, error: tokenError } = await supabase
    .from('share_tokens')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  // 檢查令牌是否存在或已過期
  if (tokenError || !shareToken) {
    notFound()
  }

  // 檢查是否過期
  if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
    notFound()
  }

  // 查詢報價單詳細資訊（包含客戶和產品資訊）
  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .select(`
      *,
      customers (
        id,
        name,
        email,
        phone,
        address,
        tax_id,
        contact_person
      )
    `)
    .eq('id', shareToken.quotation_id)
    .single()

  if (quotationError || !quotation) {
    notFound()
  }

  // 查詢報價單項目
  const { data: items, error: itemsError } = await supabase
    .from('quotation_items')
    .select(`
      *,
      products (
        id,
        name,
        description,
        unit_price,
        currency
      )
    `)
    .eq('quotation_id', quotation.id)
    .order('created_at', { ascending: true })

  if (itemsError || !items) {
    notFound()
  }

  // 更新查看次數和最後查看時間
  // 注意：這裡使用異步更新，不等待結果
  supabase
    .from('share_tokens')
    .update({
      view_count: shareToken.view_count + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', shareToken.id)
    .then()

  // 渲染分享頁面
  return (
    <SharedQuotationView
      quotation={quotation}
      items={items}
      shareToken={shareToken}
    />
  )
}

// 設定元數據
export async function generateMetadata({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  const { data: shareToken } = await supabase
    .from('share_tokens')
    .select('quotation_id')
    .eq('token', token)
    .single()

  if (!shareToken) {
    return {
      title: '報價單分享',
    }
  }

  const { data: quotation } = await supabase
    .from('quotations')
    .select('quotation_number, customers(name)')
    .eq('id', shareToken.quotation_id)
    .single()

  if (!quotation) {
    return {
      title: '報價單分享',
    }
  }

  return {
    title: `報價單 ${quotation.quotation_number}`,
    description: `查看報價單詳情`,
  }
}
