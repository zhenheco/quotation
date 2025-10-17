import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 建立測試數據的 API 端點
 * 只能由已登入的用戶執行
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 驗證用戶
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      )
    }

    const userId = user.id

    // 清除現有測試數據（可選）
    const body = await request.json()
    const { clearExisting = false } = body

    if (clearExisting) {
      // 刪除現有的報價單項目
      await supabase.from('quotation_items').delete().eq('quotation_id', '!=', '')
      // 刪除現有的報價單
      await supabase.from('quotations').delete().eq('user_id', userId)
      // 刪除現有的客戶
      await supabase.from('customers').delete().eq('user_id', userId)
      // 刪除現有的產品
      await supabase.from('products').delete().eq('user_id', userId)
    }

    // 建立測試客戶
    const customers = [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        user_id: userId,
        name: { zh: '台灣科技股份有限公司', en: 'Taiwan Tech Corp.' },
        email: 'contact@taiwantech.com.tw',
        phone: '+886-2-2345-6789',
        address: { zh: '台北市信義區信義路五段7號', en: 'No.7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City' },
        tax_id: '12345678',
        contact_person: { zh: '王大明', en: 'David Wang' }
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        user_id: userId,
        name: { zh: '優質貿易有限公司', en: 'Quality Trading Ltd.' },
        email: 'info@qualitytrading.com',
        phone: '+886-3-1234-5678',
        address: { zh: '新竹市東區光復路二段101號', en: 'No.101, Sec. 2, Guangfu Rd., East Dist., Hsinchu City' },
        tax_id: '87654321',
        contact_person: { zh: '李小華', en: 'Lisa Lee' }
      },
      {
        id: 'c3333333-3333-3333-3333-333333333333',
        user_id: userId,
        name: { zh: '創新設計工作室', en: 'Innovation Design Studio' },
        email: 'hello@innovationdesign.tw',
        phone: '+886-4-5678-1234',
        address: { zh: '台中市西屯區台灣大道三段99號', en: 'No.99, Sec. 3, Taiwan Blvd., Xitun Dist., Taichung City' },
        contact_person: { zh: '陳美玲', en: 'Meiling Chen' }
      },
      {
        id: 'c4444444-4444-4444-4444-444444444444',
        user_id: userId,
        name: { zh: '全球物流企業', en: 'Global Logistics Enterprise' },
        email: 'service@globallogistics.com.tw',
        phone: '+886-7-9876-5432',
        address: { zh: '高雄市前鎮區中山三路132號', en: 'No.132, Zhongshan 3rd Rd., Qianzhen Dist., Kaohsiung City' },
        tax_id: '11223344',
        contact_person: { zh: '張建國', en: 'Johnson Chang' }
      },
      {
        id: 'c5555555-5555-5555-5555-555555555555',
        user_id: userId,
        name: { zh: '美國進口商公司', en: 'American Importer Inc.' },
        email: 'orders@americanimporter.com',
        phone: '+1-415-555-0123',
        address: { zh: '美國加州舊金山市場街123號', en: '123 Market St, San Francisco, CA 94103, USA' },
        contact_person: { zh: '約翰史密斯', en: 'John Smith' }
      }
    ]

    const { error: customersError } = await supabase
      .from('customers')
      .upsert(customers)

    if (customersError) {
      console.error('Error creating customers:', customersError)
      return NextResponse.json(
        { error: 'Failed to create customers', details: customersError.message },
        { status: 500 }
      )
    }

    // 建立測試產品
    const products = [
      {
        id: 'p1111111-1111-1111-1111-111111111111',
        user_id: userId,
        sku: 'LAPTOP-001',
        name: { zh: '筆記型電腦', en: 'Laptop Computer' },
        description: { zh: '15.6吋 Intel i7 16GB RAM 512GB SSD', en: '15.6" Intel i7 16GB RAM 512GB SSD' },
        unit_price: 35000,
        currency: 'TWD'
      },
      {
        id: 'p2222222-2222-2222-2222-222222222222',
        user_id: userId,
        sku: 'MOUSE-001',
        name: { zh: '無線滑鼠', en: 'Wireless Mouse' },
        description: { zh: '2.4GHz 無線連接 人體工學設計', en: '2.4GHz Wireless Ergonomic Design' },
        unit_price: 800,
        currency: 'TWD'
      },
      {
        id: 'p3333333-3333-3333-3333-333333333333',
        user_id: userId,
        sku: 'KEYBOARD-001',
        name: { zh: '機械式鍵盤', en: 'Mechanical Keyboard' },
        description: { zh: '青軸 RGB 背光 104鍵', en: 'Blue Switch RGB Backlit 104 Keys' },
        unit_price: 2500,
        currency: 'TWD'
      },
      {
        id: 'p4444444-4444-4444-4444-444444444444',
        user_id: userId,
        sku: 'MONITOR-001',
        name: { zh: '27吋 4K 顯示器', en: '27" 4K Monitor' },
        description: { zh: '4K UHD IPS 面板 HDR400', en: '4K UHD IPS Panel HDR400' },
        unit_price: 12000,
        currency: 'TWD'
      },
      {
        id: 'p5555555-5555-5555-5555-555555555555',
        user_id: userId,
        sku: 'WEBCAM-001',
        name: { zh: '網路攝影機', en: 'Webcam' },
        description: { zh: '1080P 自動對焦 內建麥克風', en: '1080P Auto Focus Built-in Mic' },
        unit_price: 1500,
        currency: 'TWD'
      },
      {
        id: 'p6666666-6666-6666-6666-666666666666',
        user_id: userId,
        sku: 'HDD-001',
        name: { zh: '外接硬碟 1TB', en: 'External HDD 1TB' },
        description: { zh: 'USB 3.0 2.5吋 便攜式', en: 'USB 3.0 2.5" Portable' },
        unit_price: 1800,
        currency: 'TWD'
      },
      {
        id: 'p7777777-7777-7777-7777-777777777777',
        user_id: userId,
        sku: 'PRINTER-001',
        name: { zh: '多功能印表機', en: 'Multifunction Printer' },
        description: { zh: '列印/掃描/影印 無線連接', en: 'Print/Scan/Copy Wireless' },
        unit_price: 8500,
        currency: 'TWD'
      },
      {
        id: 'p8888888-8888-8888-8888-888888888888',
        user_id: userId,
        sku: 'CHAIR-001',
        name: { zh: '辦公椅', en: 'Office Chair' },
        description: { zh: '人體工學 腰部支撐 可調式扶手', en: 'Ergonomic Lumbar Support Adjustable Arms' },
        unit_price: 4500,
        currency: 'TWD'
      },
      {
        id: 'p9999999-9999-9999-9999-999999999999',
        user_id: userId,
        sku: 'BAG-001',
        name: { zh: '電腦包', en: 'Laptop Bag' },
        description: { zh: '15吋 防水 多夾層設計', en: '15" Waterproof Multiple Compartments' },
        unit_price: 1200,
        currency: 'TWD'
      },
      {
        id: 'paaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: userId,
        sku: 'HUB-001',
        name: { zh: 'USB 集線器', en: 'USB Hub' },
        description: { zh: '7埠 USB 3.0 附電源', en: '7-Port USB 3.0 Powered' },
        unit_price: 600,
        currency: 'TWD'
      }
    ]

    const { error: productsError } = await supabase
      .from('products')
      .upsert(products)

    if (productsError) {
      console.error('Error creating products:', productsError)
      return NextResponse.json(
        { error: 'Failed to create products', details: productsError.message },
        { status: 500 }
      )
    }

    // 建立測試報價單
    const today = new Date()
    const nextMonth = new Date(today)
    nextMonth.setMonth(today.getMonth() + 1)

    const quotations = [
      {
        id: 'q1111111-1111-1111-1111-111111111111',
        user_id: userId,
        customer_id: 'c1111111-1111-1111-1111-111111111111',
        quotation_number: 'Q2025-001',
        status: 'draft',
        issue_date: today.toISOString().split('T')[0],
        valid_until: nextMonth.toISOString().split('T')[0],
        currency: 'TWD',
        subtotal: 49000,
        tax_rate: 5,
        tax_amount: 2450,
        total_amount: 51450,
        notes: '測試報價單 - 草稿狀態'
      },
      {
        id: 'q2222222-2222-2222-2222-222222222222',
        user_id: userId,
        customer_id: 'c2222222-2222-2222-2222-222222222222',
        quotation_number: 'Q2025-002',
        status: 'sent',
        issue_date: today.toISOString().split('T')[0],
        valid_until: nextMonth.toISOString().split('T')[0],
        currency: 'TWD',
        subtotal: 26500,
        tax_rate: 5,
        tax_amount: 1325,
        total_amount: 27825,
        notes: '測試報價單 - 已發送'
      },
      {
        id: 'q3333333-3333-3333-3333-333333333333',
        user_id: userId,
        customer_id: 'c3333333-3333-3333-3333-333333333333',
        quotation_number: 'Q2025-003',
        status: 'accepted',
        issue_date: today.toISOString().split('T')[0],
        valid_until: nextMonth.toISOString().split('T')[0],
        currency: 'TWD',
        subtotal: 38400,
        tax_rate: 5,
        tax_amount: 1920,
        total_amount: 40320,
        notes: '測試報價單 - 已接受'
      },
      {
        id: 'q4444444-4444-4444-4444-444444444444',
        user_id: userId,
        customer_id: 'c5555555-5555-5555-5555-555555555555',
        quotation_number: 'Q2025-004',
        status: 'sent',
        issue_date: today.toISOString().split('T')[0],
        valid_until: nextMonth.toISOString().split('T')[0],
        currency: 'USD',
        subtotal: 1512,
        tax_rate: 0,
        tax_amount: 0,
        total_amount: 1512,
        notes: 'Test quotation - Sent to US customer'
      },
      {
        id: 'q5555555-5555-5555-5555-555555555555',
        user_id: userId,
        customer_id: 'c4444444-4444-4444-4444-444444444444',
        quotation_number: 'Q2025-005',
        status: 'rejected',
        issue_date: today.toISOString().split('T')[0],
        valid_until: nextMonth.toISOString().split('T')[0],
        currency: 'TWD',
        subtotal: 15000,
        tax_rate: 5,
        tax_amount: 750,
        total_amount: 15750,
        notes: '測試報價單 - 已拒絕'
      }
    ]

    const { error: quotationsError } = await supabase
      .from('quotations')
      .upsert(quotations)

    if (quotationsError) {
      console.error('Error creating quotations:', quotationsError)
      return NextResponse.json(
        { error: 'Failed to create quotations', details: quotationsError.message },
        { status: 500 }
      )
    }

    // 建立報價單項目
    const quotationItems = [
      // Q2025-001 items
      { quotation_id: 'q1111111-1111-1111-1111-111111111111', product_id: 'p1111111-1111-1111-1111-111111111111', quantity: 1, unit_price: 35000, discount: 0, subtotal: 35000 },
      { quotation_id: 'q1111111-1111-1111-1111-111111111111', product_id: 'p4444444-4444-4444-4444-444444444444', quantity: 1, unit_price: 12000, discount: 0, subtotal: 12000 },
      { quotation_id: 'q1111111-1111-1111-1111-111111111111', product_id: 'p3333333-3333-3333-3333-333333333333', quantity: 1, unit_price: 2500, discount: 10, subtotal: 2250 },

      // Q2025-002 items
      { quotation_id: 'q2222222-2222-2222-2222-222222222222', product_id: 'p7777777-7777-7777-7777-777777777777', quantity: 2, unit_price: 8500, discount: 0, subtotal: 17000 },
      { quotation_id: 'q2222222-2222-2222-2222-222222222222', product_id: 'p8888888-8888-8888-8888-888888888888', quantity: 2, unit_price: 4500, discount: 5, subtotal: 8550 },
      { quotation_id: 'q2222222-2222-2222-2222-222222222222', product_id: 'p2222222-2222-2222-2222-222222222222', quantity: 2, unit_price: 800, discount: 0, subtotal: 1600 },

      // Q2025-003 items
      { quotation_id: 'q3333333-3333-3333-3333-333333333333', product_id: 'p4444444-4444-4444-4444-444444444444', quantity: 3, unit_price: 12000, discount: 0, subtotal: 36000 },
      { quotation_id: 'q3333333-3333-3333-3333-333333333333', product_id: 'p5555555-5555-5555-5555-555555555555', quantity: 2, unit_price: 1500, discount: 0, subtotal: 3000 },

      // Q2025-004 items (USD)
      { quotation_id: 'q4444444-4444-4444-4444-444444444444', product_id: 'p1111111-1111-1111-1111-111111111111', quantity: 1, unit_price: 1080, discount: 0, subtotal: 1080 },
      { quotation_id: 'q4444444-4444-4444-4444-444444444444', product_id: 'p4444444-4444-4444-4444-444444444444', quantity: 1, unit_price: 360, discount: 0, subtotal: 360 },
      { quotation_id: 'q4444444-4444-4444-4444-444444444444', product_id: 'p3333333-3333-3333-3333-333333333333', quantity: 1, unit_price: 72, discount: 0, subtotal: 72 },

      // Q2025-005 items
      { quotation_id: 'q5555555-5555-5555-5555-555555555555', product_id: 'p6666666-6666-6666-6666-666666666666', quantity: 5, unit_price: 1800, discount: 0, subtotal: 9000 },
      { quotation_id: 'q5555555-5555-5555-5555-555555555555', product_id: 'p9999999-9999-9999-9999-999999999999', quantity: 5, unit_price: 1200, discount: 0, subtotal: 6000 }
    ]

    const { error: itemsError } = await supabase
      .from('quotation_items')
      .upsert(quotationItems)

    if (itemsError) {
      console.error('Error creating quotation items:', itemsError)
      return NextResponse.json(
        { error: 'Failed to create quotation items', details: itemsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '測試數據建立成功！',
      data: {
        customers: customers.length,
        products: products.length,
        quotations: quotations.length,
        quotationItems: quotationItems.length
      }
    })

  } catch (error) {
    console.error('Seed test data error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
