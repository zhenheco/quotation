import { notFound } from 'next/navigation'
import SharedQuotationView from './SharedQuotationView'
import { getZeaburPool } from '@/lib/db/zeabur'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function SharePage({ params }: PageProps) {
  const { token } = await params
  const pool = getZeaburPool()

  try {
    // 查詢分享令牌
    const tokenResult = await pool.query(
      `SELECT * FROM share_tokens
       WHERE token = $1
       AND is_active = true
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [token]
    )

    if (tokenResult.rows.length === 0) {
      notFound()
    }

    const shareToken = tokenResult.rows[0]

    // 查詢報價單和客戶資訊（JSONB 欄位會自動轉為 JSON 物件）
    const quotationResult = await pool.query(
      `SELECT
        q.*,
        c.id as customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        c.tax_id as customer_tax_id,
        c.contact_person as customer_contact_person
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1`,
      [shareToken.quotation_id]
    )

    if (quotationResult.rows.length === 0) {
      notFound()
    }

    const quotationRow = quotationResult.rows[0]

    // 重組資料結構以符合 SharedQuotationView 的需求
    const quotation = {
      id: quotationRow.id,
      quotation_number: quotationRow.quotation_number,
      issue_date: quotationRow.issue_date,
      valid_until: quotationRow.valid_until,
      status: quotationRow.status,
      currency: quotationRow.currency,
      exchange_rate: quotationRow.exchange_rate,
      subtotal: quotationRow.subtotal,
      tax_rate: quotationRow.tax_rate,
      tax_amount: quotationRow.tax_amount,
      total_amount: quotationRow.total_amount,
      notes: quotationRow.notes,
      customers: {
        id: quotationRow.customer_id,
        name: quotationRow.customer_name,
        email: quotationRow.customer_email,
        phone: quotationRow.customer_phone,
        address: quotationRow.customer_address,
        tax_id: quotationRow.customer_tax_id,
        contact_person: quotationRow.customer_contact_person,
      },
    }

    // 查詢報價單項目和產品資訊
    const itemsResult = await pool.query(
      `SELECT
        qi.*,
        p.id as product_id,
        p.name as product_name,
        p.description as product_description,
        p.unit_price as product_unit_price,
        p.currency as product_currency
       FROM quotation_items qi
       LEFT JOIN products p ON qi.product_id = p.id
       WHERE qi.quotation_id = $1
       ORDER BY qi.created_at ASC`,
      [quotation.id]
    )

    // 重組項目資料
    const items = itemsResult.rows.map((row) => ({
      id: row.id,
      quotation_id: row.quotation_id,
      product_id: row.product_id,
      quantity: row.quantity,
      unit_price: row.unit_price,
      discount: row.discount,
      subtotal: row.subtotal,
      products: {
        id: row.product_id,
        name: row.product_name,
        description: row.product_description,
        unit_price: row.product_unit_price,
        currency: row.product_currency,
      },
    }))

    // 更新查看次數和最後查看時間（異步執行，不等待）
    pool
      .query(
        `UPDATE share_tokens
         SET view_count = view_count + 1,
             last_viewed_at = NOW()
         WHERE id = $1`,
        [shareToken.id]
      )
      .catch((err) => console.error('Failed to update view count:', err))

    // 渲染分享頁面
    return (
      <SharedQuotationView
        quotation={quotation}
        items={items}
        shareToken={shareToken}
      />
    )
  } catch (error) {
    console.error('Error loading shared quotation:', error)
    notFound()
  }
}

// 設定元數據
export async function generateMetadata({ params }: PageProps) {
  const { token } = await params
  const pool = getZeaburPool()

  try {
    const tokenResult = await pool.query(
      'SELECT quotation_id FROM share_tokens WHERE token = $1',
      [token]
    )

    if (tokenResult.rows.length === 0) {
      return {
        title: '報價單分享',
      }
    }

    const quotationResult = await pool.query(
      `SELECT q.quotation_number, c.name as customer_name
       FROM quotations q
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.id = $1`,
      [tokenResult.rows[0].quotation_id]
    )

    if (quotationResult.rows.length === 0) {
      return {
        title: '報價單分享',
      }
    }

    const quotation = quotationResult.rows[0]

    return {
      title: `報價單 ${quotation.quotation_number}`,
      description: `查看報價單詳情`,
    }
  } catch (error) {
    return {
      title: '報價單分享',
    }
  }
}
