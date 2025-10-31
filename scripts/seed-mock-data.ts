import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedMockData() {
  console.log('🌱 Starting mock data seeding...\n')

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ No authenticated user found. Please log in first.')
      process.exit(1)
    }

    const userId = user.id
    console.log(`✅ Authenticated user: ${userId}\n`)

    console.log('📦 Creating mock company...')
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: { zh: '創新科技有限公司', en: 'Innovation Tech Co., Ltd.' },
        logo_url: 'https://placehold.co/200x200/4F46E5/white?text=IT',
        tax_id: '12345678',
        bank_name: '台灣銀行',
        bank_account: '123-456-789012',
        bank_code: '004',
        address: {
          zh: '台北市大安區敦化南路二段 105 號 10 樓',
          en: '10F, No. 105, Sec. 2, Dunhua S. Rd., Da\'an Dist., Taipei'
        },
        phone: '+886-2-2700-1234',
        email: 'contact@innovationtech.com.tw',
        website: 'https://www.innovationtech.com.tw'
      })
      .select()
      .single()

    if (companyError) throw companyError
    console.log(`✅ Company created: ${company.id}`)

    const { data: adminRole } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single()

    if (adminRole) {
      await supabase.from('company_members').insert({
        company_id: company.id,
        user_id: userId,
        role_id: adminRole.id,
        is_owner: true,
        is_active: true
      })
      console.log('✅ User assigned as company owner\n')
    }

    console.log('📦 Creating 5 mock products...')
    const products = [
      {
        name: { zh: '網站開發服務', en: 'Web Development Service' },
        description: { zh: '完整的網站開發服務，包含前端和後端', en: 'Complete web development service including frontend and backend' },
        base_price: 50000,
        base_currency: 'TWD',
        category: 'Development',
        user_id: userId,
        cost_price: 30000,
        cost_currency: 'TWD',
        profit_margin: 40.0,
        supplier: 'Internal Team',
        sku: 'WEB-DEV-001'
      },
      {
        name: { zh: '手機應用程式開發', en: 'Mobile App Development' },
        description: { zh: 'iOS 和 Android 原生應用開發', en: 'Native iOS and Android app development' },
        base_price: 80000,
        base_currency: 'TWD',
        category: 'Development',
        user_id: userId,
        cost_price: 50000,
        cost_currency: 'TWD',
        profit_margin: 37.5,
        supplier: 'Internal Team',
        sku: 'MOB-DEV-001'
      },
      {
        name: { zh: '雲端主機服務 (月租)', en: 'Cloud Hosting Service (Monthly)' },
        description: { zh: '包含 SSL 證書、CDN 加速和自動備份', en: 'Includes SSL certificate, CDN acceleration and auto backup' },
        base_price: 3000,
        base_currency: 'TWD',
        category: 'Hosting',
        user_id: userId,
        cost_price: 1800,
        cost_currency: 'TWD',
        profit_margin: 40.0,
        supplier: 'AWS',
        sku: 'HOST-CLOUD-001'
      },
      {
        name: { zh: 'SEO 優化服務', en: 'SEO Optimization Service' },
        description: { zh: '搜尋引擎優化，提升網站排名', en: 'Search engine optimization to improve website ranking' },
        base_price: 15000,
        base_currency: 'TWD',
        category: 'Marketing',
        user_id: userId,
        cost_price: 8000,
        cost_currency: 'TWD',
        profit_margin: 46.7,
        supplier: 'SEO Agency',
        sku: 'SEO-OPT-001'
      },
      {
        name: { zh: 'UI/UX 設計服務', en: 'UI/UX Design Service' },
        description: { zh: '使用者介面和體驗設計', en: 'User interface and experience design' },
        base_price: 25000,
        base_currency: 'TWD',
        category: 'Design',
        user_id: userId,
        cost_price: 15000,
        cost_currency: 'TWD',
        profit_margin: 40.0,
        supplier: 'Design Team',
        sku: 'UIUX-DES-001'
      }
    ]

    const { data: createdProducts, error: productsError } = await supabase
      .from('products')
      .insert(products)
      .select()

    if (productsError) throw productsError
    console.log(`✅ Created ${createdProducts.length} products\n`)

    console.log('👥 Creating 3 mock customers...')
    const customers = [
      {
        name: { zh: '科技新創公司', en: 'Tech Startup Inc.' },
        email: 'contact@techstartup.com',
        phone: '+886-2-1234-5678',
        address: {
          zh: '台北市信義區信義路五段7號',
          en: 'No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei'
        },
        user_id: userId
      },
      {
        name: { zh: '電商平台有限公司', en: 'E-Commerce Platform Ltd.' },
        email: 'hello@ecomshop.com',
        phone: '+886-4-2345-6789',
        address: {
          zh: '台中市西屯區台灣大道三段99號',
          en: 'No. 99, Sec. 3, Taiwan Blvd., Xitun Dist., Taichung'
        },
        user_id: userId
      },
      {
        name: { zh: '傳統製造業股份有限公司', en: 'Traditional Manufacturing Co., Ltd.' },
        email: 'info@manufacturing.com',
        phone: '+886-7-3456-7890',
        address: {
          zh: '高雄市前鎮區中山三路132號',
          en: 'No. 132, Zhongshan 3rd Rd., Qianzhen Dist., Kaohsiung'
        },
        user_id: userId
      }
    ]

    const { data: createdCustomers, error: customersError } = await supabase
      .from('customers')
      .insert(customers)
      .select()

    if (customersError) throw customersError
    console.log(`✅ Created ${createdCustomers.length} customers\n`)

    console.log('📄 Creating 3 mock quotations...')
    const today = new Date()
    const quotations = [
      {
        quotation_number: 'QT-2025-001',
        customer_id: createdCustomers[0].id,
        issue_date: today.toISOString().split('T')[0],
        valid_until: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        currency: 'TWD',
        exchange_rate: 1.0,
        subtotal: 100000,
        tax_rate: 5,
        tax_amount: 5000,
        total: 105000,
        notes: {
          zh: '網站開發專案，包含 RWD 響應式設計',
          en: 'Web development project with RWD responsive design'
        },
        user_id: userId,
        payment_status: 'unpaid',
        payment_due_date: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_paid: 0
      },
      {
        quotation_number: 'QT-2025-002',
        customer_id: createdCustomers[1].id,
        issue_date: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() + 23 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'sent',
        currency: 'TWD',
        exchange_rate: 1.0,
        subtotal: 105000,
        tax_rate: 5,
        tax_amount: 5250,
        total: 110250,
        notes: {
          zh: '手機應用程式開發專案，iOS 和 Android 雙平台',
          en: 'Mobile app development project for both iOS and Android'
        },
        user_id: userId,
        payment_status: 'unpaid',
        payment_due_date: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_paid: 0
      },
      {
        quotation_number: 'QT-2025-003',
        customer_id: createdCustomers[2].id,
        issue_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'accepted',
        currency: 'TWD',
        exchange_rate: 1.0,
        subtotal: 36000,
        tax_rate: 5,
        tax_amount: 1800,
        total: 37800,
        notes: {
          zh: '年度雲端主機維護合約',
          en: 'Annual cloud hosting maintenance contract'
        },
        user_id: userId,
        payment_status: 'partial',
        payment_due_date: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_paid: 10000,
        deposit_amount: 10000,
        deposit_paid_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        contract_signed_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        contract_expiry_date: new Date(today.getTime() + 350 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_frequency: 'monthly',
        next_collection_date: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        next_collection_amount: 3150
      }
    ]

    const { data: createdQuotations, error: quotationsError } = await supabase
      .from('quotations')
      .insert(quotations)
      .select()

    if (quotationsError) throw quotationsError
    console.log(`✅ Created ${createdQuotations.length} quotations\n`)

    console.log('📝 Creating quotation items...')
    const quotationItems = [
      { quotation_id: createdQuotations[0].id, product_id: createdProducts[0].id, description: { zh: '網站開發服務', en: 'Web Development Service' }, quantity: 1, unit_price: 50000, discount: 0, amount: 50000, sort_order: 1 },
      { quotation_id: createdQuotations[0].id, product_id: createdProducts[4].id, description: { zh: 'UI/UX 設計服務', en: 'UI/UX Design Service' }, quantity: 1, unit_price: 25000, discount: 0, amount: 25000, sort_order: 2 },
      { quotation_id: createdQuotations[0].id, product_id: createdProducts[3].id, description: { zh: 'SEO 優化服務', en: 'SEO Optimization Service' }, quantity: 1, unit_price: 15000, discount: 0, amount: 15000, sort_order: 3 },
      { quotation_id: createdQuotations[0].id, product_id: createdProducts[2].id, description: { zh: '雲端主機服務 (首年)', en: 'Cloud Hosting Service (First Year)' }, quantity: 3, unit_price: 3000, discount: 1000, amount: 8000, sort_order: 4 },
      { quotation_id: createdQuotations[1].id, product_id: createdProducts[1].id, description: { zh: '手機應用程式開發', en: 'Mobile App Development' }, quantity: 1, unit_price: 80000, discount: 0, amount: 80000, sort_order: 1 },
      { quotation_id: createdQuotations[1].id, product_id: createdProducts[4].id, description: { zh: 'UI/UX 設計服務', en: 'UI/UX Design Service' }, quantity: 1, unit_price: 25000, discount: 0, amount: 25000, sort_order: 2 },
      { quotation_id: createdQuotations[2].id, product_id: createdProducts[2].id, description: { zh: '雲端主機服務 (年約)', en: 'Cloud Hosting Service (Annual Contract)' }, quantity: 12, unit_price: 3000, discount: 0, amount: 36000, sort_order: 1 }
    ]

    const { error: itemsError } = await supabase
      .from('quotation_items')
      .insert(quotationItems)

    if (itemsError) throw itemsError
    console.log(`✅ Created quotation items\n`)

    console.log('📝 Creating 2 mock contracts...')
    const { data: contract1, error: contract1Error } = await supabase.rpc('create_contract', {
      p_user_id: userId,
      p_customer_id: createdCustomers[2].id,
      p_quotation_id: createdQuotations[2].id,
      p_contract_number: 'CT-2025-001',
      p_title: 'Annual Cloud Hosting Service Contract',
      p_description: 'Monthly cloud hosting service with 12-month commitment',
      p_start_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_end_date: new Date(today.getTime() + 350 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_total_amount: 37800,
      p_currency: 'TWD',
      p_payment_terms: 'Monthly payment due on the 15th of each month',
      p_billing_frequency: 'monthly',
      p_next_billing_date: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_auto_renew: true,
      p_status: 'active'
    })

    if (contract1Error) throw contract1Error
    console.log(`✅ Contract 1 created`)

    const { data: contract2, error: contract2Error } = await supabase.rpc('create_contract', {
      p_user_id: userId,
      p_customer_id: createdCustomers[0].id,
      p_quotation_id: null,
      p_contract_number: 'CT-2025-002',
      p_title: 'Web Development Maintenance Contract',
      p_description: 'Quarterly maintenance and support service',
      p_start_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_end_date: new Date(today.getTime() + 372 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_total_amount: 60000,
      p_currency: 'TWD',
      p_payment_terms: 'Quarterly payment, 15000 TWD per quarter',
      p_billing_frequency: 'quarterly',
      p_next_billing_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_auto_renew: false,
      p_status: 'draft'
    })

    if (contract2Error) throw contract2Error
    console.log(`✅ Contract 2 created\n`)

    console.log('💰 Creating 3 mock payments...')
    await supabase.rpc('create_payment', {
      p_user_id: userId,
      p_contract_id: contract1,
      p_quotation_id: createdQuotations[2].id,
      p_payment_number: 'PAY-2025-001',
      p_payment_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_amount: 10000,
      p_currency: 'TWD',
      p_payment_method: 'bank_transfer',
      p_reference_number: 'TXN20250101001',
      p_notes: 'Deposit payment for annual hosting contract',
      p_status: 'completed'
    })

    await supabase.rpc('create_payment', {
      p_user_id: userId,
      p_contract_id: contract1,
      p_quotation_id: null,
      p_payment_number: 'PAY-2025-002',
      p_payment_date: null,
      p_amount: 3150,
      p_currency: 'TWD',
      p_payment_method: null,
      p_reference_number: null,
      p_notes: 'Monthly hosting fee - January 2025',
      p_status: 'pending',
      p_due_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })

    await supabase.rpc('create_payment', {
      p_user_id: userId,
      p_contract_id: contract1,
      p_quotation_id: null,
      p_payment_number: 'PAY-2025-003',
      p_payment_date: null,
      p_amount: 3150,
      p_currency: 'TWD',
      p_payment_method: null,
      p_reference_number: null,
      p_notes: 'Monthly hosting fee - February 2025',
      p_status: 'pending',
      p_due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })

    console.log(`✅ Created 3 payment records\n`)

    console.log('💱 Creating 5 exchange rate records...')
    const exchangeRates = [
      { from_currency: 'USD', to_currency: 'TWD', rate: 31.5, date: today.toISOString().split('T')[0], source: 'Manual Entry' },
      { from_currency: 'EUR', to_currency: 'TWD', rate: 34.2, date: today.toISOString().split('T')[0], source: 'Manual Entry' },
      { from_currency: 'JPY', to_currency: 'TWD', rate: 0.21, date: today.toISOString().split('T')[0], source: 'Manual Entry' },
      { from_currency: 'CNY', to_currency: 'TWD', rate: 4.35, date: today.toISOString().split('T')[0], source: 'Manual Entry' },
      { from_currency: 'HKD', to_currency: 'TWD', rate: 4.05, date: today.toISOString().split('T')[0], source: 'Manual Entry' }
    ]

    const { error: ratesError } = await supabase
      .from('exchange_rates')
      .insert(exchangeRates)

    if (ratesError) throw ratesError
    console.log(`✅ Created 5 exchange rate records\n`)

    console.log('============================================================================')
    console.log('✅ Mock data creation completed successfully!')
    console.log('============================================================================')
    console.log('Summary:')
    console.log('  - Company: 1 (Innovation Tech Co., Ltd. with current user as owner)')
    console.log('  - Products: 5 (Web Dev, Mobile App, Cloud Hosting, SEO, UI/UX)')
    console.log('  - Customers: 3 (Tech Startup, E-Commerce, Manufacturing)')
    console.log('  - Quotations: 3 (1 draft, 1 sent, 1 accepted)')
    console.log('  - Contracts: 2 (1 active, 1 draft)')
    console.log('  - Payments: 3 (1 completed, 1 overdue, 1 upcoming)')
    console.log('  - Exchange Rates: 5 currency pairs')
    console.log('============================================================================')
    console.log('🎉 You can now test all features with realistic data!')
    console.log('============================================================================')

  } catch (error) {
    console.error('❌ Error creating mock data:', error)
    process.exit(1)
  }
}

seedMockData()
