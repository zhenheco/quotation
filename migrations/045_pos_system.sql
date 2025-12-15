-- ============================================================================
-- Migration: 045_pos_system.sql
-- Created: 2025-12-15
-- Description: 建立 POS 收銀系統表格 - 租戶、服務、會員、銷售
-- Source: Account-system Prisma Schema
-- ============================================================================

-- ============================================================================
-- 1. 租戶主檔 (Tenants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資料
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  logo VARCHAR(500),
  description VARCHAR(500),

  -- 訂閱方案
  plan tenant_plan DEFAULT 'STARTER',
  plan_expiry_at TIMESTAMPTZ,

  -- 限制設定
  max_branches INTEGER DEFAULT 1,
  max_staff_count INTEGER DEFAULT 5,

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);

COMMENT ON TABLE tenants IS 'POS 租戶主檔（品牌/公司層級）';

-- ============================================================================
-- 2. 使用者-租戶權限關聯
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role staff_role DEFAULT 'TECHNICIAN',
  branch_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tenants_user ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant ON user_tenants(tenant_id);

COMMENT ON TABLE user_tenants IS '使用者-租戶權限關聯';

-- ============================================================================
-- 3. 分店主檔 (Branches)
-- ============================================================================

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- 基本資料
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  display_name VARCHAR(100),
  phone VARCHAR(20),
  address VARCHAR(200),

  -- 營業時間
  open_time VARCHAR(5) DEFAULT '09:00',
  close_time VARCHAR(5) DEFAULT '21:00',

  -- 會計整合
  company_id UUID REFERENCES companies(id),

  -- 狀態
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

COMMENT ON TABLE branches IS 'POS 分店主檔';

-- 更新 user_tenants 的 branch_id FK
ALTER TABLE user_tenants
  ADD CONSTRAINT fk_user_tenants_branch
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. 服務類別 (Service Categories)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description VARCHAR(200),
  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_tenant ON service_categories(tenant_id);

COMMENT ON TABLE service_categories IS 'POS 服務類別';

-- ============================================================================
-- 5. 服務項目 (Services)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pos_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description VARCHAR(500),

  category_id UUID NOT NULL REFERENCES service_categories(id),

  -- 價格與時間
  price NUMERIC(10,2) NOT NULL,
  duration_mins INTEGER NOT NULL,

  -- 會計整合
  account_code VARCHAR(10),
  tax_code_id UUID REFERENCES tax_codes(id),

  -- 顯示設定
  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_pos_services_tenant ON pos_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_services_category ON pos_services(category_id);
CREATE INDEX IF NOT EXISTS idx_pos_services_is_active ON pos_services(is_active);

COMMENT ON TABLE pos_services IS 'POS 服務項目';

-- ============================================================================
-- 6. 服務套餐 (Service Packages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description VARCHAR(500),

  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2) NOT NULL,

  icon VARCHAR(50),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_service_packages_tenant ON service_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_packages_is_active ON service_packages(is_active);

COMMENT ON TABLE service_packages IS 'POS 服務套餐';

-- ============================================================================
-- 7. 套餐包含的服務 (Service Package Services)
-- ============================================================================

CREATE TABLE IF NOT EXISTS service_package_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES service_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES pos_services(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,

  UNIQUE(package_id, service_id)
);

COMMENT ON TABLE service_package_services IS '套餐包含的服務';

-- ============================================================================
-- 8. 技師/員工 (Staff)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pos_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- 基本資料
  name VARCHAR(50) NOT NULL,
  nickname VARCHAR(20),
  phone VARCHAR(20),
  email VARCHAR(100),
  id_number VARCHAR(20),

  -- 員工資料
  employee_id VARCHAR(20),
  hire_date DATE,
  role staff_role DEFAULT 'TECHNICIAN',

  -- 銀行資料
  bank_account VARCHAR(20),
  bank_code VARCHAR(3),

  -- 顯示設定
  avatar VARCHAR(500),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pos_staff_tenant ON pos_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_staff_is_active ON pos_staff(is_active);

COMMENT ON TABLE pos_staff IS 'POS 技師/員工';

-- ============================================================================
-- 9. 技師排班 (Staff Schedules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES pos_staff(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  start_time VARCHAR(5) NOT NULL,
  end_time VARCHAR(5) NOT NULL,

  status schedule_status DEFAULT 'SCHEDULED',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_schedules_staff_date ON staff_schedules(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_branch_date ON staff_schedules(branch_id, date);

COMMENT ON TABLE staff_schedules IS '技師排班';

-- ============================================================================
-- 10. 抽成規則 (Commission Rules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description VARCHAR(200),

  staff_id UUID REFERENCES pos_staff(id),
  service_id UUID REFERENCES pos_services(id),

  type commission_type NOT NULL,
  config JSONB NOT NULL,

  priority INTEGER DEFAULT 0,

  effective_from DATE NOT NULL,
  effective_to DATE,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_commission_rules_tenant ON commission_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_staff ON commission_rules(staff_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_service ON commission_rules(service_id);
CREATE INDEX IF NOT EXISTS idx_commission_rules_is_active ON commission_rules(is_active);

COMMENT ON TABLE commission_rules IS 'POS 抽成規則';

-- ============================================================================
-- 11. 會員等級 (Member Levels)
-- ============================================================================

CREATE TABLE IF NOT EXISTS member_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(50) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description VARCHAR(200),

  min_spent NUMERIC(12,2) NOT NULL,

  discount_rate NUMERIC(5,4) DEFAULT 0,
  points_multiplier NUMERIC(3,2) DEFAULT 1,

  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_member_levels_tenant ON member_levels(tenant_id);

COMMENT ON TABLE member_levels IS 'POS 會員等級';

-- ============================================================================
-- 12. 會員 (Members)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pos_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- 基本資料
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  gender gender,
  birthday DATE,

  -- 會員資料
  member_no VARCHAR(20) NOT NULL,
  join_date DATE DEFAULT CURRENT_DATE,

  -- 會員等級
  level_id UUID REFERENCES member_levels(id),
  level_upgrade_date DATE,

  -- 餘額與點數
  balance NUMERIC(12,2) DEFAULT 0,
  points INTEGER DEFAULT 0,
  total_spent NUMERIC(14,2) DEFAULT 0,

  -- 個資同意
  consent_at TIMESTAMPTZ,
  marketing_consent BOOLEAN DEFAULT false,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(tenant_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_pos_members_tenant_phone ON pos_members(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_pos_members_tenant ON pos_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_members_is_active ON pos_members(is_active);
CREATE INDEX IF NOT EXISTS idx_pos_members_level ON pos_members(level_id);
CREATE INDEX IF NOT EXISTS idx_pos_members_join_date ON pos_members(tenant_id, join_date);

COMMENT ON TABLE pos_members IS 'POS 會員';

-- ============================================================================
-- 13. 儲值促銷活動 (Deposit Promotions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS deposit_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  description VARCHAR(500),

  type deposit_promotion_type NOT NULL,
  config JSONB NOT NULL,

  start_date DATE NOT NULL,
  end_date DATE,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_promotions_tenant ON deposit_promotions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deposit_promotions_is_active ON deposit_promotions(is_active);

COMMENT ON TABLE deposit_promotions IS 'POS 儲值促銷活動';

-- ============================================================================
-- 14. 會員儲值記錄 (Member Deposits)
-- ============================================================================

CREATE TABLE IF NOT EXISTS member_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES pos_members(id) ON DELETE CASCADE,

  deposit_amount NUMERIC(10,2) NOT NULL,
  bonus_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,

  payment_method payment_method_type NOT NULL,

  promotion_id UUID REFERENCES deposit_promotions(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_member_deposits_member ON member_deposits(member_id);

COMMENT ON TABLE member_deposits IS 'POS 會員儲值記錄';

-- ============================================================================
-- 15. 日結帳記錄 (Daily Settlements)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),

  settlement_date DATE NOT NULL,

  -- 銷售統計
  total_sales NUMERIC(12,2) NOT NULL,
  transaction_count INTEGER NOT NULL,
  voided_count INTEGER DEFAULT 0,
  refunded_amount NUMERIC(12,2) DEFAULT 0,

  -- 付款方式統計
  cash_amount NUMERIC(12,2) DEFAULT 0,
  card_amount NUMERIC(12,2) DEFAULT 0,
  deposit_used NUMERIC(12,2) DEFAULT 0,
  other_amount NUMERIC(12,2) DEFAULT 0,

  -- 儲值統計
  deposit_received NUMERIC(12,2) DEFAULT 0,

  -- 現金盤點
  expected_cash NUMERIC(12,2) NOT NULL,
  actual_cash NUMERIC(12,2),
  cash_variance NUMERIC(12,2),

  -- 審核
  status settlement_status DEFAULT 'PENDING',
  variance_reason VARCHAR(500),
  approved_by VARCHAR(50),
  approved_at TIMESTAMPTZ,

  -- 鎖定
  is_locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(50),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(branch_id, settlement_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_settlements_branch ON daily_settlements(branch_id);
CREATE INDEX IF NOT EXISTS idx_daily_settlements_date ON daily_settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_daily_settlements_status ON daily_settlements(status);

COMMENT ON TABLE daily_settlements IS 'POS 日結帳記錄';

-- ============================================================================
-- 16. 銷售交易主檔 (Sales Transactions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id),

  transaction_no VARCHAR(30) NOT NULL,

  transaction_date DATE NOT NULL,
  transaction_time TIMESTAMPTZ NOT NULL,

  -- 會員資訊
  member_id UUID REFERENCES pos_members(id),
  member_name VARCHAR(50),

  -- 金額
  subtotal NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) DEFAULT 0,

  -- 折扣資訊
  discount_type discount_type,
  discount_reason VARCHAR(200),

  -- 狀態
  status sales_status DEFAULT 'COMPLETED',

  -- 作廢資訊
  voided_at TIMESTAMPTZ,
  void_reason VARCHAR(200),
  voided_by VARCHAR(50),

  -- 會計整合
  invoice_id UUID,
  journal_entry_id UUID,

  -- 日結關聯
  settlement_id UUID REFERENCES daily_settlements(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(50),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, transaction_no)
);

CREATE INDEX IF NOT EXISTS idx_sales_transactions_tenant_date ON sales_transactions(tenant_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_branch_date ON sales_transactions(branch_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_member ON sales_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_status ON sales_transactions(status);
CREATE INDEX IF NOT EXISTS idx_sales_transactions_settlement ON sales_transactions(settlement_id);

COMMENT ON TABLE sales_transactions IS 'POS 銷售交易主檔';

-- ============================================================================
-- 17. 交易明細 (Transaction Items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,

  service_id UUID REFERENCES pos_services(id),
  service_package_id UUID REFERENCES service_packages(id),

  item_name VARCHAR(100) NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,

  staff_id UUID REFERENCES pos_staff(id),
  staff_name VARCHAR(50),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_service ON transaction_items(service_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_staff ON transaction_items(staff_id);

COMMENT ON TABLE transaction_items IS 'POS 交易明細';

-- ============================================================================
-- 18. 交易付款明細 (Transaction Payments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,

  payment_method payment_method_type NOT NULL,
  amount NUMERIC(10,2) NOT NULL,

  received_amount NUMERIC(10,2),
  change_amount NUMERIC(10,2),

  member_balance_used NUMERIC(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_payments_transaction ON transaction_payments(transaction_id);

COMMENT ON TABLE transaction_payments IS 'POS 交易付款明細';

-- ============================================================================
-- 19. 交易抽成記錄 (Transaction Commissions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES sales_transactions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES pos_staff(id),

  service_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(5,4),

  rule_type commission_type,
  rule_config JSONB,

  is_settled BOOLEAN DEFAULT false,
  settled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_commissions_transaction ON transaction_commissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_commissions_staff ON transaction_commissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_transaction_commissions_is_settled ON transaction_commissions(is_settled);

COMMENT ON TABLE transaction_commissions IS 'POS 交易抽成記錄';

-- ============================================================================
-- 20. RLS Helper Function: can_access_tenant_rls
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_tenant_rls(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 21. RLS 政策
-- ============================================================================

-- 啟用 RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_commissions ENABLE ROW LEVEL SECURITY;

-- tenants RLS
CREATE POLICY "tenants_select" ON tenants
  FOR SELECT USING (
    can_access_tenant_rls(id) OR is_super_admin()
  );

CREATE POLICY "tenants_insert" ON tenants
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "tenants_update" ON tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenants
      WHERE tenant_id = id
        AND user_id = auth.uid()
        AND role = 'OWNER'
    ) OR is_super_admin()
  );

CREATE POLICY "tenants_delete" ON tenants
  FOR DELETE USING (is_super_admin());

-- user_tenants RLS
CREATE POLICY "user_tenants_select" ON user_tenants
  FOR SELECT USING (
    user_id = auth.uid()
    OR can_access_tenant_rls(tenant_id)
    OR is_super_admin()
  );

CREATE POLICY "user_tenants_insert" ON user_tenants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.tenant_id = tenant_id
        AND ut.user_id = auth.uid()
        AND ut.role IN ('OWNER', 'MANAGER')
    ) OR is_super_admin()
  );

CREATE POLICY "user_tenants_update" ON user_tenants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.tenant_id = tenant_id
        AND ut.user_id = auth.uid()
        AND ut.role IN ('OWNER', 'MANAGER')
    ) OR is_super_admin()
  );

CREATE POLICY "user_tenants_delete" ON user_tenants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.tenant_id = tenant_id
        AND ut.user_id = auth.uid()
        AND ut.role = 'OWNER'
    ) OR is_super_admin()
  );

-- 租戶層級 RLS 通用 Macro
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM (VALUES
      ('branches'), ('service_categories'), ('pos_services'),
      ('service_packages'), ('pos_staff'), ('commission_rules'),
      ('member_levels'), ('pos_members'), ('deposit_promotions'),
      ('daily_settlements'), ('sales_transactions')
    ) AS tables(table_name)
  LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %s
      FOR SELECT USING (
        can_access_tenant_rls(tenant_id) OR is_super_admin()
      )', t, t);

    EXECUTE format('CREATE POLICY "%s_insert" ON %s
      FOR INSERT WITH CHECK (can_access_tenant_rls(tenant_id))', t, t);

    EXECUTE format('CREATE POLICY "%s_update" ON %s
      FOR UPDATE USING (can_access_tenant_rls(tenant_id))', t, t);

    EXECUTE format('CREATE POLICY "%s_delete" ON %s
      FOR DELETE USING (
        can_access_tenant_rls(tenant_id) OR is_super_admin()
      )', t, t);
  END LOOP;
END $$;

-- service_package_services RLS（透過 package_id 繼承）
CREATE POLICY "service_package_services_select" ON service_package_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_packages sp
      WHERE sp.id = package_id
        AND (can_access_tenant_rls(sp.tenant_id) OR is_super_admin())
    )
  );

CREATE POLICY "service_package_services_insert" ON service_package_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_packages sp
      WHERE sp.id = package_id
        AND can_access_tenant_rls(sp.tenant_id)
    )
  );

CREATE POLICY "service_package_services_update" ON service_package_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM service_packages sp
      WHERE sp.id = package_id
        AND can_access_tenant_rls(sp.tenant_id)
    )
  );

CREATE POLICY "service_package_services_delete" ON service_package_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM service_packages sp
      WHERE sp.id = package_id
        AND can_access_tenant_rls(sp.tenant_id)
    )
  );

-- staff_schedules RLS（透過 staff_id 繼承）
CREATE POLICY "staff_schedules_select" ON staff_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pos_staff s
      WHERE s.id = staff_id
        AND (can_access_tenant_rls(s.tenant_id) OR is_super_admin())
    )
  );

CREATE POLICY "staff_schedules_insert" ON staff_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pos_staff s
      WHERE s.id = staff_id
        AND can_access_tenant_rls(s.tenant_id)
    )
  );

CREATE POLICY "staff_schedules_update" ON staff_schedules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM pos_staff s
      WHERE s.id = staff_id
        AND can_access_tenant_rls(s.tenant_id)
    )
  );

CREATE POLICY "staff_schedules_delete" ON staff_schedules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM pos_staff s
      WHERE s.id = staff_id
        AND can_access_tenant_rls(s.tenant_id)
    )
  );

-- member_deposits RLS（透過 member_id 繼承）
CREATE POLICY "member_deposits_select" ON member_deposits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pos_members m
      WHERE m.id = member_id
        AND (can_access_tenant_rls(m.tenant_id) OR is_super_admin())
    )
  );

CREATE POLICY "member_deposits_insert" ON member_deposits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pos_members m
      WHERE m.id = member_id
        AND can_access_tenant_rls(m.tenant_id)
    )
  );

-- transaction_items RLS（透過 transaction_id 繼承）
CREATE POLICY "transaction_items_all" ON transaction_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales_transactions st
      WHERE st.id = transaction_id
        AND (can_access_tenant_rls(st.tenant_id) OR is_super_admin())
    )
  );

-- transaction_payments RLS
CREATE POLICY "transaction_payments_all" ON transaction_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales_transactions st
      WHERE st.id = transaction_id
        AND (can_access_tenant_rls(st.tenant_id) OR is_super_admin())
    )
  );

-- transaction_commissions RLS
CREATE POLICY "transaction_commissions_all" ON transaction_commissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales_transactions st
      WHERE st.id = transaction_id
        AND (can_access_tenant_rls(st.tenant_id) OR is_super_admin())
    )
  );

-- ============================================================================
-- 22. 時間戳觸發器
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM (VALUES
      ('tenants'), ('user_tenants'), ('branches'), ('service_categories'),
      ('pos_services'), ('service_packages'), ('pos_staff'), ('staff_schedules'),
      ('commission_rules'), ('member_levels'), ('pos_members'),
      ('deposit_promotions'), ('daily_settlements'), ('sales_transactions')
    ) AS tables(table_name)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 23. 權限設定
-- ============================================================================

-- POS 權限
INSERT INTO permissions (resource, action, name, description) VALUES
  -- 租戶管理
  ('tenants', 'read', 'tenants:read', '檢視租戶'),
  ('tenants', 'write', 'tenants:write', '建立/編輯租戶'),
  ('tenants', 'delete', 'tenants:delete', '刪除租戶'),
  -- 分店管理
  ('branches', 'read', 'branches:read', '檢視分店'),
  ('branches', 'write', 'branches:write', '建立/編輯分店'),
  ('branches', 'delete', 'branches:delete', '刪除分店'),
  -- 服務管理
  ('pos_services', 'read', 'pos_services:read', '檢視服務'),
  ('pos_services', 'write', 'pos_services:write', '建立/編輯服務'),
  ('pos_services', 'delete', 'pos_services:delete', '刪除服務'),
  -- 員工管理
  ('pos_staff', 'read', 'pos_staff:read', '檢視員工'),
  ('pos_staff', 'write', 'pos_staff:write', '建立/編輯員工'),
  ('pos_staff', 'delete', 'pos_staff:delete', '刪除員工'),
  -- 會員管理
  ('pos_members', 'read', 'pos_members:read', '檢視會員'),
  ('pos_members', 'write', 'pos_members:write', '建立/編輯會員'),
  ('pos_members', 'delete', 'pos_members:delete', '刪除會員'),
  -- 銷售交易
  ('sales_transactions', 'read', 'sales_transactions:read', '檢視銷售'),
  ('sales_transactions', 'write', 'sales_transactions:write', '建立銷售'),
  ('sales_transactions', 'void', 'sales_transactions:void', '作廢銷售'),
  -- 日結帳
  ('daily_settlements', 'read', 'daily_settlements:read', '檢視日結'),
  ('daily_settlements', 'write', 'daily_settlements:write', '執行日結'),
  ('daily_settlements', 'approve', 'daily_settlements:approve', '審核日結')
ON CONFLICT (name) DO NOTHING;

-- Super Admin：所有 POS 權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.resource IN ('tenants', 'branches', 'pos_services', 'pos_staff', 'pos_members', 'sales_transactions', 'daily_settlements')
ON CONFLICT DO NOTHING;

-- Company Owner：所有 POS 權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
  AND p.resource IN ('tenants', 'branches', 'pos_services', 'pos_staff', 'pos_members', 'sales_transactions', 'daily_settlements')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 24. 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('045_pos_system.sql')
ON CONFLICT (filename) DO NOTHING;

NOTIFY pgrst, 'reload schema';

SELECT 'POS system tables migration completed! 19 tables created.' as status;
