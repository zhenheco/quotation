-- ========================================
-- 測試數據腳本（自動獲取 USER_ID）
-- ========================================
-- 此腳本會自動使用當前登入用戶的 ID
-- 可直接在 Supabase Dashboard → SQL Editor 中執行
-- ========================================

-- 建立臨時函數來獲取當前用戶 ID
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  -- 獲取第一個用戶的 ID（假設已經登入過一次）
  SELECT id INTO current_user_id FROM auth.users LIMIT 1;

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION '找不到用戶！請先登入系統一次。';
  END IF;

  RAISE NOTICE '使用 User ID: %', current_user_id;

  -- ========================================
  -- 1. 建立測試客戶 (Customers)
  -- ========================================

  INSERT INTO customers (id, name, email, phone, address, user_id) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '{"zh": "台灣科技股份有限公司", "en": "Taiwan Tech Co., Ltd."}',
    'contact@taiwantech.com',
    '+886-2-2345-6789',
    '{"zh": "台北市信義區信義路五段7號", "en": "No. 7, Sec. 5, Xinyi Rd., Xinyi Dist., Taipei City"}',
    current_user_id
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '{"zh": "優質貿易有限公司", "en": "Quality Trade Ltd."}',
    'info@qualitytrade.com',
    '+886-3-1234-5678',
    '{"zh": "新竹市東區光復路二段101號", "en": "No. 101, Sec. 2, Guangfu Rd., East Dist., Hsinchu City"}',
    current_user_id
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '{"zh": "創新設計工作室", "en": "Innovation Design Studio"}',
    'hello@innovate-design.com',
    '+886-4-2222-3333',
    '{"zh": "台中市西屯區台灣大道三段99號", "en": "No. 99, Sec. 3, Taiwan Blvd., Xitun Dist., Taichung City"}',
    current_user_id
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '{"zh": "全球物流企業", "en": "Global Logistics Enterprise"}',
    'service@globallogistics.com',
    '+886-7-3456-7890',
    '{"zh": "高雄市前鎮區中山二路5號", "en": "No. 5, Zhongshan 2nd Rd., Qianzhen Dist., Kaohsiung City"}',
    current_user_id
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    '{"zh": "美國進口商公司", "en": "USA Import Corporation"}',
    'import@usaimport.com',
    '+1-415-123-4567',
    '{"zh": "美國加州舊金山市場街123號", "en": "123 Market St, San Francisco, CA 94103, USA"}',
    current_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ 已建立 5 個測試客戶';

  -- ========================================
  -- 2. 建立測試產品 (Products)
  -- ========================================

  INSERT INTO products (id, name, description, base_price, base_currency, category, user_id) VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"zh": "筆記型電腦", "en": "Laptop Computer"}',
    '{"zh": "高效能商務筆記型電腦，Intel i7 處理器，16GB RAM，512GB SSD", "en": "High-performance business laptop, Intel i7 processor, 16GB RAM, 512GB SSD"}',
    35000.00,
    'TWD',
    '電腦設備',
    current_user_id
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '{"zh": "無線滑鼠", "en": "Wireless Mouse"}',
    '{"zh": "符合人體工學設計的無線滑鼠，2.4GHz 連接，續航力 12 個月", "en": "Ergonomic wireless mouse, 2.4GHz connection, 12-month battery life"}',
    800.00,
    'TWD',
    '電腦週邊',
    current_user_id
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '{"zh": "機械式鍵盤", "en": "Mechanical Keyboard"}',
    '{"zh": "青軸機械式鍵盤，RGB 背光，全鍵無衝突", "en": "Blue switch mechanical keyboard, RGB backlight, N-key rollover"}',
    2500.00,
    'TWD',
    '電腦週邊',
    current_user_id
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '{"zh": "27吋 4K 顯示器", "en": "27-inch 4K Monitor"}',
    '{"zh": "27吋 IPS 面板 4K 顯示器，HDR 支援，99% sRGB 色域", "en": "27-inch IPS 4K monitor, HDR support, 99% sRGB color gamut"}',
    12000.00,
    'TWD',
    '顯示設備',
    current_user_id
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '{"zh": "網路攝影機", "en": "Webcam"}',
    '{"zh": "1080p 高畫質網路攝影機，自動對焦，內建麥克風", "en": "1080p HD webcam, auto-focus, built-in microphone"}',
    1500.00,
    'TWD',
    '電腦週邊',
    current_user_id
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '{"zh": "外接硬碟 1TB", "en": "External Hard Drive 1TB"}',
    '{"zh": "USB 3.0 外接式硬碟，1TB 容量，防震設計", "en": "USB 3.0 external hard drive, 1TB capacity, shock-resistant design"}',
    1800.00,
    'TWD',
    '儲存設備',
    current_user_id
  ),
  (
    '10101010-1010-1010-1010-101010101010',
    '{"zh": "多功能印表機", "en": "Multifunction Printer"}',
    '{"zh": "彩色雷射多功能事務機，列印/掃描/影印/傳真", "en": "Color laser multifunction printer, print/scan/copy/fax"}',
    8500.00,
    'TWD',
    '辦公設備',
    current_user_id
  ),
  (
    '20202020-2020-2020-2020-202020202020',
    '{"zh": "辦公椅", "en": "Office Chair"}',
    '{"zh": "人體工學辦公椅，可調式扶手，腰部支撐", "en": "Ergonomic office chair, adjustable armrests, lumbar support"}',
    4500.00,
    'TWD',
    '辦公家具',
    current_user_id
  ),
  (
    '30303030-3030-3030-3030-303030303030',
    '{"zh": "電腦包", "en": "Laptop Bag"}',
    '{"zh": "防水電腦後背包，可放 15.6 吋筆電，多隔層設計", "en": "Waterproof laptop backpack, fits 15.6-inch laptop, multi-compartment design"}',
    1200.00,
    'TWD',
    '配件',
    current_user_id
  ),
  (
    '40404040-4040-4040-4040-404040404040',
    '{"zh": "USB 集線器", "en": "USB Hub"}',
    '{"zh": "7 埠 USB 3.0 集線器，獨立開關，外接電源", "en": "7-port USB 3.0 hub, individual switches, external power supply"}',
    600.00,
    'TWD',
    '電腦週邊',
    current_user_id
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ 已建立 10 個測試產品';

  -- ========================================
  -- 3. 建立測試報價單 (Quotations)
  -- ========================================

  -- 報價單 1: 草稿狀態
  INSERT INTO quotations (
    id, quotation_number, customer_id, issue_date, valid_until, status,
    currency, exchange_rate, subtotal, tax_rate, tax_amount, total, notes, user_id
  ) VALUES (
    'q1111111-1111-1111-1111-111111111111',
    'Q2025-001',
    '11111111-1111-1111-1111-111111111111',
    '2025-10-16', '2025-11-15', 'draft',
    'TWD', 1.0, 50300.00, 5.00, 2515.00, 52815.00,
    '{"zh": "感謝貴公司的詢價，此報價單有效期限為 30 天。", "en": "Thank you for your inquiry. This quotation is valid for 30 days."}',
    current_user_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, discount, amount, sort_order) VALUES
  ('q1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"zh": "筆記型電腦", "en": "Laptop Computer"}', 1.00, 35000.00, 0.00, 35000.00, 1),
  ('q1111111-1111-1111-1111-111111111111', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '{"zh": "27吋 4K 顯示器", "en": "27-inch 4K Monitor"}', 1.00, 12000.00, 0.00, 12000.00, 2),
  ('q1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"zh": "機械式鍵盤", "en": "Mechanical Keyboard"}', 1.00, 2500.00, 0.00, 2500.00, 3),
  ('q1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"zh": "無線滑鼠", "en": "Wireless Mouse"}', 1.00, 800.00, 0.00, 800.00, 4)
  ON CONFLICT (id) DO NOTHING;

  -- 報價單 2: 已發送狀態
  INSERT INTO quotations (
    id, quotation_number, customer_id, issue_date, valid_until, status,
    currency, exchange_rate, subtotal, tax_rate, tax_amount, total, notes, user_id
  ) VALUES (
    'q2222222-2222-2222-2222-222222222222',
    'Q2025-002',
    '22222222-2222-2222-2222-222222222222',
    '2025-10-15', '2025-11-14', 'sent',
    'TWD', 1.0, 48675.00, 5.00, 2433.75, 51108.75,
    '{"zh": "大量訂購可享額外折扣，歡迎洽詢。", "en": "Additional discounts available for bulk orders. Please contact us for details."}',
    current_user_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, discount, amount, sort_order) VALUES
  ('q2222222-2222-2222-2222-222222222222', '10101010-1010-1010-1010-101010101010', '{"zh": "多功能印表機", "en": "Multifunction Printer"}', 2.00, 8500.00, 10.00, 15300.00, 1),
  ('q2222222-2222-2222-2222-222222222222', '20202020-2020-2020-2020-202020202020', '{"zh": "辦公椅", "en": "Office Chair"}', 5.00, 4500.00, 5.00, 21375.00, 2),
  ('q2222222-2222-2222-2222-222222222222', '30303030-3030-3030-3030-303030303030', '{"zh": "電腦包", "en": "Laptop Bag"}', 10.00, 1200.00, 0.00, 12000.00, 3)
  ON CONFLICT (id) DO NOTHING;

  -- 報價單 3: 已接受狀態
  INSERT INTO quotations (
    id, quotation_number, customer_id, issue_date, valid_until, status,
    currency, exchange_rate, subtotal, tax_rate, tax_amount, total, notes, user_id
  ) VALUES (
    'q3333333-3333-3333-3333-333333333333',
    'Q2025-003',
    '33333333-3333-3333-3333-333333333333',
    '2025-10-10', '2025-11-09', 'accepted',
    'TWD', 1.0, 106650.00, 5.00, 5332.50, 111982.50,
    '{"zh": "已確認訂單，預計 7 個工作天內出貨。", "en": "Order confirmed. Estimated delivery within 7 business days."}',
    current_user_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, discount, amount, sort_order) VALUES
  ('q3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"zh": "筆記型電腦", "en": "Laptop Computer"}', 3.00, 35000.00, 5.00, 99750.00, 1),
  ('q3333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '{"zh": "網路攝影機", "en": "Webcam"}', 3.00, 1500.00, 0.00, 4500.00, 2),
  ('q3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"zh": "無線滑鼠", "en": "Wireless Mouse"}', 3.00, 800.00, 0.00, 2400.00, 3)
  ON CONFLICT (id) DO NOTHING;

  -- 報價單 4: 美元報價
  INSERT INTO quotations (
    id, quotation_number, customer_id, issue_date, valid_until, status,
    currency, exchange_rate, subtotal, tax_rate, tax_amount, total, notes, user_id
  ) VALUES (
    'q4444444-4444-4444-4444-444444444444',
    'Q2025-004',
    '55555555-5555-5555-5555-555555555555',
    '2025-10-12', '2025-11-11', 'sent',
    'USD', 31.5, 1606.34, 0.00, 0.00, 1606.34,
    '{"zh": "價格以美元計價，不含美國當地稅金。", "en": "Prices in USD, local taxes not included."}',
    current_user_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, discount, amount, sort_order) VALUES
  ('q4444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '{"zh": "筆記型電腦", "en": "Laptop Computer"}', 1.00, 1111.11, 0.00, 1111.11, 1),
  ('q4444444-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '{"zh": "27吋 4K 顯示器", "en": "27-inch 4K Monitor"}', 1.00, 380.95, 0.00, 380.95, 2),
  ('q4444444-4444-4444-4444-444444444444', 'ffffffff-ffff-ffff-ffff-ffffffffffff', '{"zh": "外接硬碟 1TB", "en": "External Hard Drive 1TB"}', 2.00, 57.14, 0.00, 114.28, 3)
  ON CONFLICT (id) DO NOTHING;

  -- 報價單 5: 已拒絕狀態
  INSERT INTO quotations (
    id, quotation_number, customer_id, issue_date, valid_until, status,
    currency, exchange_rate, subtotal, tax_rate, tax_amount, total, notes, user_id
  ) VALUES (
    'q5555555-5555-5555-5555-555555555555',
    'Q2025-005',
    '44444444-4444-4444-4444-444444444444',
    '2025-10-08', '2025-11-07', 'rejected',
    'TWD', 1.0, 39000.00, 5.00, 1950.00, 40950.00,
    '{"zh": "客戶因預算考量暫不採購。", "en": "Customer declined due to budget constraints."}',
    current_user_id
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO quotation_items (quotation_id, product_id, description, quantity, unit_price, discount, amount, sort_order) VALUES
  ('q5555555-5555-5555-5555-555555555555', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '{"zh": "27吋 4K 顯示器", "en": "27-inch 4K Monitor"}', 3.00, 12000.00, 0.00, 36000.00, 1),
  ('q5555555-5555-5555-5555-555555555555', '40404040-4040-4040-4040-404040404040', '{"zh": "USB 集線器", "en": "USB Hub"}', 5.00, 600.00, 0.00, 3000.00, 2)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ 已建立 5 個測試報價單';

  -- ========================================
  -- 4. 匯率數據
  -- ========================================

  INSERT INTO exchange_rates (from_currency, to_currency, rate, date, source) VALUES
  ('TWD', 'USD', 0.0317, '2025-10-16', 'manual'),
  ('USD', 'TWD', 31.5, '2025-10-16', 'manual'),
  ('TWD', 'EUR', 0.029, '2025-10-16', 'manual'),
  ('EUR', 'TWD', 34.5, '2025-10-16', 'manual'),
  ('TWD', 'JPY', 4.65, '2025-10-16', 'manual'),
  ('JPY', 'TWD', 0.215, '2025-10-16', 'manual'),
  ('TWD', 'CNY', 0.228, '2025-10-16', 'manual'),
  ('CNY', 'TWD', 4.38, '2025-10-16', 'manual')
  ON CONFLICT (from_currency, to_currency, date) DO NOTHING;

  RAISE NOTICE '✅ 已建立匯率數據';

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 測試數據匯入完成！';
  RAISE NOTICE '========================================';
END $$;
