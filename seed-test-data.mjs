import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedTestData() {
  console.log('=== 開始建立測試資料 ===\n')

  // 獲取用戶 ID
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users.users.find(u => u.email === 'acejou27@gmail.com')

  if (!user) {
    console.error('❌ 找不到用戶 acejou27@gmail.com')
    return
  }

  const userId = user.id
  console.log('✅ 用戶 ID:', userId)

  // 1. 建立測試客戶
  console.log('\n📝 建立測試客戶...')
  const customers = [
    {
      name: { zh: '台灣科技有限公司', en: 'Taiwan Tech Co., Ltd.' },
      email: 'contact@taiwantech.com',
      phone: '+886-2-1234-5678',
      address: { zh: '台北市信義區信義路五段7號', en: '7 Xinyi Rd. Sec. 5, Xinyi Dist., Taipei City' },
      user_id: userId
    },
    {
      name: { zh: '環球貿易股份有限公司', en: 'Global Trade Inc.' },
      email: 'info@globaltrade.com',
      phone: '+886-3-9876-5432',
      address: { zh: '新竹市東區光復路一段1號', en: '1 Guangfu Rd. Sec. 1, East Dist., Hsinchu City' },
      user_id: userId
    },
    {
      name: { zh: '創新軟體開發公司', en: 'Innovation Software Dev.' },
      email: 'hello@innovsoft.com',
      phone: '+886-4-5555-6666',
      address: { zh: '台中市西屯區台灣大道三段99號', en: '99 Taiwan Blvd. Sec. 3, Xitun Dist., Taichung City' },
      user_id: userId
    }
  ]

  const { data: createdCustomers, error: customerError } = await supabase
    .from('customers')
    .insert(customers)
    .select()

  if (customerError) {
    console.error('❌ 建立客戶失敗:', customerError)
    return
  }

  console.log(`✅ 成功建立 ${createdCustomers.length} 個客戶`)

  // 2. 建立測試產品
  console.log('\n📝 建立測試產品...')
  const products = [
    {
      name: { zh: '企業網站開發', en: 'Enterprise Website Development' },
      description: { zh: '客製化企業官方網站，包含 RWD 響應式設計', en: 'Customized corporate website with RWD responsive design' },
      unit_price: 150000,
      currency: 'TWD',
      category: '網頁開發',
      user_id: userId
    },
    {
      name: { zh: '行動應用程式開發', en: 'Mobile App Development' },
      description: { zh: 'iOS 和 Android 雙平台原生應用程式開發', en: 'Native iOS and Android mobile application development' },
      unit_price: 300000,
      currency: 'TWD',
      category: '應用程式開發',
      user_id: userId
    },
    {
      name: { zh: '雲端系統整合服務', en: 'Cloud System Integration' },
      description: { zh: 'AWS/Azure/GCP 雲端架構設計與系統遷移', en: 'AWS/Azure/GCP cloud architecture design and system migration' },
      unit_price: 200000,
      currency: 'TWD',
      category: '雲端服務',
      user_id: userId
    },
    {
      name: { zh: 'UI/UX 設計服務', en: 'UI/UX Design Service' },
      description: { zh: '使用者介面與體驗設計，含原型製作', en: 'User interface and experience design with prototyping' },
      unit_price: 80000,
      currency: 'TWD',
      category: '設計服務',
      user_id: userId
    },
    {
      name: { zh: '系統維護年約', en: 'Annual System Maintenance' },
      description: { zh: '全年系統維護與技術支援服務', en: 'Annual system maintenance and technical support' },
      unit_price: 120000,
      currency: 'TWD',
      category: '維護服務',
      user_id: userId
    }
  ]

  const { data: createdProducts, error: productError } = await supabase
    .from('products')
    .insert(products)
    .select()

  if (productError) {
    console.error('❌ 建立產品失敗:', productError)
    return
  }

  console.log(`✅ 成功建立 ${createdProducts.length} 個產品`)

  // 3. 建立測試報價單
  console.log('\n📝 建立測試報價單...')

  // 報價單 1
  const quotation1 = {
    quotation_number: 'Q2025-001',
    customer_id: createdCustomers[0].id,
    issue_date: new Date().toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'sent',
    currency: 'TWD',
    exchange_rate: 1,
    subtotal: 230000,
    tax_amount: 11500,
    tax_rate: 5,
    total_amount: 241500,
    notes: { zh: '感謝貴公司的詢價，此報價單有效期限為 30 天。', en: 'Thank you for your inquiry. This quotation is valid for 30 days.' },
    user_id: userId,
    payment_status: 'unpaid',
    total_paid: 0
  }

  const { data: q1, error: q1Error } = await supabase
    .from('quotations')
    .insert(quotation1)
    .select()
    .single()

  if (q1Error) {
    console.error('❌ 建立報價單 1 失敗:', q1Error)
  } else {
    console.log('✅ 建立報價單:', quotation1.quotation_number)

    // 建立報價單 1 的項目
    const q1Items = [
      {
        quotation_id: q1.id,
        product_id: createdProducts[0].id,
        quantity: 1,
        unit_price: createdProducts[0].unit_price,
        discount: 0,
        subtotal: createdProducts[0].unit_price
      },
      {
        quotation_id: q1.id,
        product_id: createdProducts[3].id,
        quantity: 1,
        unit_price: createdProducts[3].unit_price,
        discount: 0,
        subtotal: createdProducts[3].unit_price
      }
    ]

    const { error: q1ItemsError } = await supabase
      .from('quotation_items')
      .insert(q1Items)

    if (q1ItemsError) {
      console.error('❌ 建立報價單 1 項目失敗:', q1ItemsError)
    }
  }

  // 報價單 2
  const quotation2 = {
    quotation_number: 'Q2025-002',
    customer_id: createdCustomers[1].id,
    issue_date: new Date().toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'accepted',
    currency: 'TWD',
    exchange_rate: 1,
    subtotal: 390000,
    tax_amount: 19500,
    tax_rate: 5,
    total_amount: 409500,
    notes: { zh: '專案包含三個月的免費維護期。', en: 'Project includes three months of free maintenance.' },
    user_id: userId,
    payment_status: 'unpaid',
    total_paid: 0
  }

  const { data: q2, error: q2Error } = await supabase
    .from('quotations')
    .insert(quotation2)
    .select()
    .single()

  if (q2Error) {
    console.error('❌ 建立報價單 2 失敗:', q2Error)
  } else {
    console.log('✅ 建立報價單:', quotation2.quotation_number)

    // 建立報價單 2 的項目
    const q2Items = [
      {
        quotation_id: q2.id,
        product_id: createdProducts[1].id,
        quantity: 1,
        unit_price: createdProducts[1].unit_price,
        discount: 10,
        subtotal: createdProducts[1].unit_price * 0.9
      },
      {
        quotation_id: q2.id,
        product_id: createdProducts[4].id,
        quantity: 1,
        unit_price: createdProducts[4].unit_price,
        discount: 0,
        subtotal: createdProducts[4].unit_price
      }
    ]

    const { error: q2ItemsError } = await supabase
      .from('quotation_items')
      .insert(q2Items)

    if (q2ItemsError) {
      console.error('❌ 建立報價單 2 項目失敗:', q2ItemsError)
    }
  }

  // 報價單 3
  const quotation3 = {
    quotation_number: 'Q2025-003',
    customer_id: createdCustomers[2].id,
    issue_date: new Date().toISOString(),
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'draft',
    currency: 'TWD',
    exchange_rate: 1,
    subtotal: 200000,
    tax_amount: 10000,
    tax_rate: 5,
    total_amount: 210000,
    notes: { zh: '此為初步報價，實際價格將依專案規模調整。', en: 'This is a preliminary quotation. Actual price will be adjusted based on project scope.' },
    user_id: userId,
    payment_status: 'unpaid',
    total_paid: 0
  }

  const { data: q3, error: q3Error } = await supabase
    .from('quotations')
    .insert(quotation3)
    .select()
    .single()

  if (q3Error) {
    console.error('❌ 建立報價單 3 失敗:', q3Error)
  } else {
    console.log('✅ 建立報價單:', quotation3.quotation_number)

    // 建立報價單 3 的項目
    const q3Items = [
      {
        quotation_id: q3.id,
        product_id: createdProducts[2].id,
        quantity: 1,
        unit_price: createdProducts[2].unit_price,
        discount: 0,
        subtotal: createdProducts[2].unit_price
      }
    ]

    const { error: q3ItemsError } = await supabase
      .from('quotation_items')
      .insert(q3Items)

    if (q3ItemsError) {
      console.error('❌ 建立報價單 3 項目失敗:', q3ItemsError)
    }
  }

  console.log('\n=== 測試資料建立完成 ===')
  console.log('✅ 客戶: 3 筆')
  console.log('✅ 產品: 5 筆')
  console.log('✅ 報價單: 3 筆')
  console.log('✅ 報價單項目: 4 筆')
}

seedTestData()
