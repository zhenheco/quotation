-- ============================================================================
-- Mock Data Seeding Script
-- Created: 2025-10-30
-- Description: Creates comprehensive mock data for testing all features
-- ============================================================================

-- Get the current authenticated user ID (assumes you're logged in)
DO $$
DECLARE
  v_user_id UUID := auth.uid();
  v_customer_1_id UUID;
  v_customer_2_id UUID;
  v_customer_3_id UUID;
  v_product_1_id UUID;
  v_product_2_id UUID;
  v_product_3_id UUID;
  v_product_4_id UUID;
  v_product_5_id UUID;
  v_quotation_1_id UUID;
  v_quotation_2_id UUID;
  v_quotation_3_id UUID;
  v_contract_1_id UUID;
  v_contract_2_id UUID;
BEGIN
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No authenticated user found. Please log in first.';
  END IF;

  RAISE NOTICE 'Creating mock data for user: %', v_user_id;

  -- ============================================================================
  -- 1. Create Mock Company
  -- ============================================================================

  -- Create a test company with complete information
  INSERT INTO companies (
    name,
    logo_url,
    tax_id,
    bank_name,
    bank_account,
    bank_code,
    address,
    phone,
    email,
    website
  ) VALUES (
    '{"zh": "創新科技有限公司", "en": "Innovation Tech Co., Ltd."}',
    'https://placehold.co/200x200/4F46E5/white?text=IT',
    '12345678',
    '台灣銀行',
    '123-456-789012',
    '004',
    '{"zh": "台北市大安區敦化南路二段 105 號 10 樓", "en": "10F, No. 105, Sec. 2, Dunhua S. Rd., Da''an Dist., Taipei"}',
    '+886-2-2700-1234',
    'contact@innovationtech.com.tw',
    'https://www.innovationtech.com.tw'
  );

  -- Add the current user as company owner
  INSERT INTO company_members (
    company_id,
    user_id,
    role_id,
    is_owner,
    is_active
  )
  SELECT
    c.id,
    v_user_id,
    r.id,
    true,
    true
  FROM companies c
  CROSS JOIN roles r
  WHERE c.tax_id = '12345678'
    AND r.name = 'admin'
  LIMIT 1;

  RAISE NOTICE 'Created mock company and assigned user as owner';

  -- ============================================================================
  -- 2. Create Mock Products/Services
  -- ============================================================================

  -- Product 1: Web Development Service
  INSERT INTO products (
    name, description, base_price, base_currency, category, user_id,
    cost_price, cost_currency, profit_margin, supplier, sku
  ) VALUES (
    '{"zh": "網站開發服務", "en": "Web Development Service"}',
    '{"zh": "完整的網站開發服務，包含前端和後端", "en": "Complete web development service including frontend and backend"}',
    50000, 'TWD', 'Development', v_user_id,
    30000, 'TWD', 40.0, 'Internal Team', 'WEB-DEV-001'
  ) RETURNING id INTO v_product_1_id;

  -- Product 2: Mobile App Development
  INSERT INTO products (
    name, description, base_price, base_currency, category, user_id,
    cost_price, cost_currency, profit_margin, supplier, sku
  ) VALUES (
    '{"zh": "手機應用程式開發", "en": "Mobile App Development"}',
    '{"zh": "iOS 和 Android 原生應用開發", "en": "Native iOS and Android app development"}',
    80000, 'TWD', 'Development', v_user_id,
    50000, 'TWD', 37.5, 'Internal Team', 'MOB-DEV-001'
  ) RETURNING id INTO v_product_2_id;

  -- Product 3: Cloud Hosting Service
  INSERT INTO products (
    name, description, base_price, base_currency, category, user_id,
    cost_price, cost_currency, profit_margin, supplier, sku
  ) VALUES (
    '{"zh": "雲端主機服務 (月租)", "en": "Cloud Hosting Service (Monthly)"}',
    '{"zh": "包含 SSL 證書、CDN 加速和自動備份", "en": "Includes SSL certificate, CDN acceleration and auto backup"}',
    3000, 'TWD', 'Hosting', v_user_id,
    1800, 'TWD', 40.0, 'AWS', 'HOST-CLOUD-001'
  ) RETURNING id INTO v_product_3_id;

  -- Product 4: SEO Optimization
  INSERT INTO products (
    name, description, base_price, base_currency, category, user_id,
    cost_price, cost_currency, profit_margin, supplier, sku
  ) VALUES (
    '{"zh": "SEO 優化服務", "en": "SEO Optimization Service"}',
    '{"zh": "搜尋引擎優化，提升網站排名", "en": "Search engine optimization to improve website ranking"}',
    15000, 'TWD', 'Marketing', v_user_id,
    8000, 'TWD', 46.7, 'SEO Agency', 'SEO-OPT-001'
  ) RETURNING id INTO v_product_4_id;

  -- Product 5: UI/UX Design
  INSERT INTO products (
    name, description, base_price, base_currency, category, user_id,
    cost_price, cost_currency, profit_margin, supplier, sku
  ) VALUES (
    '{"zh": "UI/UX 設計服務", "en": "UI/UX Design Service"}',
    '{"zh": "使用者介面和體驗設計", "en": "User interface and experience design"}',
    25000, 'TWD', 'Design', v_user_id,
    15000, 'TWD', 40.0, 'Design Team', 'UIUX-DES-001'
  ) RETURNING id INTO v_product_5_id;

  RAISE NOTICE 'Created 5 products';

  -- ============================================================================
  -- 2. Create Mock Customers
  -- ============================================================================

  -- Customer 1: Tech Startup
  INSERT INTO customers (
    name, email, phone, address, user_id
  ) VALUES (
    '{"zh": "科技新創公司", "en": "Tech Startup Inc."}',
    'contact@techstartup.com',
    '+886-2-1234-5678',
    '{"zh": "台北市信義區信義路五段7號", "en": "No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei"}',
    v_user_id
  ) RETURNING id INTO v_customer_1_id;

  -- Customer 2: E-commerce Company
  INSERT INTO customers (
    name, email, phone, address, user_id
  ) VALUES (
    '{"zh": "電商平台有限公司", "en": "E-Commerce Platform Ltd."}',
    'hello@ecomshop.com',
    '+886-4-2345-6789',
    '{"zh": "台中市西屯區台灣大道三段99號", "en": "No. 99, Sec. 3, Taiwan Blvd., Xitun Dist., Taichung"}',
    v_user_id
  ) RETURNING id INTO v_customer_2_id;

  -- Customer 3: Traditional Business
  INSERT INTO customers (
    name, email, phone, address, user_id
  ) VALUES (
    '{"zh": "傳統製造業股份有限公司", "en": "Traditional Manufacturing Co., Ltd."}',
    'info@manufacturing.com',
    '+886-7-3456-7890',
    '{"zh": "高雄市前鎮區中山三路132號", "en": "No. 132, Zhongshan 3rd Rd., Qianzhen Dist., Kaohsiung"}',
    v_user_id
  ) RETURNING id INTO v_customer_3_id;

  RAISE NOTICE 'Created 3 customers';

  -- ============================================================================
  -- 3. Create Mock Quotations
  -- ============================================================================

  -- Quotation 1: Draft - Web Development Project
  INSERT INTO quotations (
    quotation_number, customer_id, issue_date, valid_until, status,
    currency, exchange_rate, subtotal, tax_rate, tax_amount, total,
    notes, user_id, payment_status, payment_due_date, total_paid
  ) VALUES (
    'QT-2025-001',
    v_customer_1_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    'draft',
    'TWD', 1.0, 100000, 5, 5000, 105000,
    '{"zh": "網站開發專案，包含 RWD 響應式設計", "en": "Web development project with RWD responsive design"}',
    v_user_id, 'unpaid', CURRENT_DATE + INTERVAL '30 days', 0
  ) RETURNING id INTO v_quotation_1_id;

  -- Add items to Quotation 1
  INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, discount, amount, sort_order)
  VALUES
    (v_quotation_1_id, v_product_1_id, '{"zh": "網站開發服務", "en": "Web Development Service"}', 1, 50000, 0, 50000, 1),
    (v_quotation_1_id, v_product_5_id, '{"zh": "UI/UX 設計服務", "en": "UI/UX Design Service"}', 1, 25000, 0, 25000, 2),
    (v_quotation_1_id, v_product_4_id, '{"zh": "SEO 優化服務", "en": "SEO Optimization Service"}', 1, 15000, 0, 15000, 3),
    (v_quotation_1_id, v_product_3_id, '{"zh": "雲端主機服務 (首年)", "en": "Cloud Hosting Service (First Year)"}', 3, 3000, 1000, 8000, 4);

  -- Quotation 2: Sent - Mobile App Development
  INSERT INTO quotations (
    quotation_number, customer_id, issue_date, valid_until, status,
    currency, exchange_rate, subtotal, tax_rate, tax_amount, total,
    notes, user_id, payment_status, payment_due_date, total_paid
  ) VALUES (
    'QT-2025-002',
    v_customer_2_id,
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '23 days',
    'sent',
    'TWD', 1.0, 105000, 5, 5250, 110250,
    '{"zh": "手機應用程式開發專案，iOS 和 Android 雙平台", "en": "Mobile app development project for both iOS and Android"}',
    v_user_id, 'unpaid', CURRENT_DATE + INTERVAL '45 days', 0
  ) RETURNING id INTO v_quotation_2_id;

  -- Add items to Quotation 2
  INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, discount, amount, sort_order)
  VALUES
    (v_quotation_2_id, v_product_2_id, '{"zh": "手機應用程式開發", "en": "Mobile App Development"}', 1, 80000, 0, 80000, 1),
    (v_quotation_2_id, v_product_5_id, '{"zh": "UI/UX 設計服務", "en": "UI/UX Design Service"}', 1, 25000, 0, 25000, 2);

  -- Quotation 3: Accepted - Long-term Hosting Service
  INSERT INTO quotations (
    quotation_number, customer_id, issue_date, valid_until, status,
    currency, exchange_rate, subtotal, tax_rate, tax_amount, total,
    notes, user_id, payment_status, payment_due_date, total_paid,
    deposit_amount, deposit_paid_date,
    contract_signed_date, contract_expiry_date,
    payment_frequency, next_collection_date, next_collection_amount
  ) VALUES (
    'QT-2025-003',
    v_customer_3_id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '1 day',
    'accepted',
    'TWD', 1.0, 36000, 5, 1800, 37800,
    '{"zh": "年度雲端主機維護合約", "en": "Annual cloud hosting maintenance contract"}',
    v_user_id, 'partial', CURRENT_DATE + INTERVAL '15 days', 10000,
    10000, CURRENT_DATE - INTERVAL '20 days',
    CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '350 days',
    'monthly', CURRENT_DATE + INTERVAL '15 days', 3150
  ) RETURNING id INTO v_quotation_3_id;

  -- Add items to Quotation 3
  INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, discount, amount, sort_order)
  VALUES
    (v_quotation_3_id, v_product_3_id, '{"zh": "雲端主機服務 (年約)", "en": "Cloud Hosting Service (Annual Contract)"}', 12, 3000, 0, 36000, 1);

  RAISE NOTICE 'Created 3 quotations with items';

  -- ============================================================================
  -- 4. Create Mock Contracts (using RPC function)
  -- ============================================================================

  -- Contract 1: Active contract from Quotation 3
  SELECT create_contract(
    p_user_id := v_user_id,
    p_customer_id := v_customer_3_id,
    p_quotation_id := v_quotation_3_id,
    p_contract_number := 'CT-2025-001',
    p_title := 'Annual Cloud Hosting Service Contract',
    p_description := 'Monthly cloud hosting service with 12-month commitment',
    p_start_date := CURRENT_DATE - INTERVAL '15 days',
    p_end_date := CURRENT_DATE + INTERVAL '350 days',
    p_total_amount := 37800,
    p_currency := 'TWD',
    p_payment_terms := 'Monthly payment due on the 15th of each month',
    p_billing_frequency := 'monthly',
    p_next_billing_date := CURRENT_DATE + INTERVAL '15 days',
    p_auto_renew := true,
    p_status := 'active'
  ) INTO v_contract_1_id;

  -- Contract 2: Draft contract for potential customer
  SELECT create_contract(
    p_user_id := v_user_id,
    p_customer_id := v_customer_1_id,
    p_quotation_id := NULL,
    p_contract_number := 'CT-2025-002',
    p_title := 'Web Development Maintenance Contract',
    p_description := 'Quarterly maintenance and support service',
    p_start_date := CURRENT_DATE + INTERVAL '7 days',
    p_end_date := CURRENT_DATE + INTERVAL '372 days',
    p_total_amount := 60000,
    p_currency := 'TWD',
    p_payment_terms := 'Quarterly payment, 15000 TWD per quarter',
    p_billing_frequency := 'quarterly',
    p_next_billing_date := CURRENT_DATE + INTERVAL '7 days',
    p_auto_renew := false,
    p_status := 'draft'
  ) INTO v_contract_2_id;

  RAISE NOTICE 'Created 2 contracts';

  -- ============================================================================
  -- 5. Create Mock Payment Records (using RPC function)
  -- ============================================================================

  -- Payment 1: Deposit payment for Contract 1
  PERFORM create_payment(
    p_user_id := v_user_id,
    p_contract_id := v_contract_1_id,
    p_quotation_id := v_quotation_3_id,
    p_payment_number := 'PAY-2025-001',
    p_payment_date := CURRENT_DATE - INTERVAL '20 days',
    p_amount := 10000,
    p_currency := 'TWD',
    p_payment_method := 'bank_transfer',
    p_reference_number := 'TXN20250101001',
    p_notes := 'Deposit payment for annual hosting contract',
    p_status := 'completed'
  );

  -- Payment 2: Overdue payment reminder
  PERFORM create_payment(
    p_user_id := v_user_id,
    p_contract_id := v_contract_1_id,
    p_quotation_id := NULL,
    p_payment_number := 'PAY-2025-002',
    p_payment_date := NULL,
    p_amount := 3150,
    p_currency := 'TWD',
    p_payment_method := NULL,
    p_reference_number := NULL,
    p_notes := 'Monthly hosting fee - January 2025',
    p_status := 'pending',
    p_due_date := CURRENT_DATE - INTERVAL '5 days'
  );

  -- Payment 3: Upcoming payment
  PERFORM create_payment(
    p_user_id := v_user_id,
    p_contract_id := v_contract_1_id,
    p_quotation_id := NULL,
    p_payment_number := 'PAY-2025-003',
    p_payment_date := NULL,
    p_amount := 3150,
    p_currency := 'TWD',
    p_payment_method := NULL,
    p_reference_number := NULL,
    p_notes := 'Monthly hosting fee - February 2025',
    p_status := 'pending',
    p_due_date := CURRENT_DATE + INTERVAL '10 days'
  );

  RAISE NOTICE 'Created 3 payment records';

  -- ============================================================================
  -- 6. Create Some Exchange Rate Records
  -- ============================================================================

  INSERT INTO exchange_rates (from_currency, to_currency, rate, date, source)
  VALUES
    ('USD', 'TWD', 31.5, CURRENT_DATE, 'Manual Entry'),
    ('EUR', 'TWD', 34.2, CURRENT_DATE, 'Manual Entry'),
    ('JPY', 'TWD', 0.21, CURRENT_DATE, 'Manual Entry'),
    ('CNY', 'TWD', 4.35, CURRENT_DATE, 'Manual Entry'),
    ('HKD', 'TWD', 4.05, CURRENT_DATE, 'Manual Entry');

  RAISE NOTICE 'Created 5 exchange rate records';

  -- ============================================================================
  -- Summary
  -- ============================================================================
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Mock data creation completed successfully!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Company: 1 (Innovation Tech Co., Ltd. with current user as owner)';
  RAISE NOTICE '  - Products: 5 (Web Dev, Mobile App, Cloud Hosting, SEO, UI/UX)';
  RAISE NOTICE '  - Customers: 3 (Tech Startup, E-Commerce, Manufacturing)';
  RAISE NOTICE '  - Quotations: 3 (1 draft, 1 sent, 1 accepted)';
  RAISE NOTICE '  - Contracts: 2 (1 active, 1 draft)';
  RAISE NOTICE '  - Payments: 3 (1 completed, 1 overdue, 1 upcoming)';
  RAISE NOTICE '  - Exchange Rates: 5 currency pairs';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'You can now test all features with realistic data!';
  RAISE NOTICE '============================================================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating mock data: %', SQLERRM;
END $$;
