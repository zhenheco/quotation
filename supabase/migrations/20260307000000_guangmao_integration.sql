-- ============================================================================
-- 光貿 (Amego) 電子發票整合 - Guangmao Integration Migration
-- ============================================================================

-- 1. 發票請求佇列 (解耦訂單與發票開立)
CREATE TABLE IF NOT EXISTS acc_invoice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('ISSUE', 'VOID', 'ALLOWANCE', 'VOID_ALLOWANCE')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'SUCCESS', 'FAILED')),
  request_data JSONB NOT NULL,  -- 光貿 API 請求資料
  response_data JSONB,          -- 光貿 API 回應
  invoice_id UUID REFERENCES acc_invoices(id) ON DELETE SET NULL,  -- 成功後關聯
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_acc_invoice_requests_company_id ON acc_invoice_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_acc_invoice_requests_status ON acc_invoice_requests(status);
CREATE INDEX IF NOT EXISTS idx_acc_invoice_requests_created_at ON acc_invoice_requests(created_at DESC);

-- 2. 為 acc_invoices 表新增光貿相關欄位
ALTER TABLE acc_invoices ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'IMPORT', 'GUANGMAO'));
ALTER TABLE acc_invoices ADD COLUMN IF NOT EXISTS guangmao_track_id TEXT;
ALTER TABLE acc_invoices ADD COLUMN IF NOT EXISTS guangmao_status TEXT;
ALTER TABLE acc_invoices ADD COLUMN IF NOT EXISTS carrier_type TEXT;
ALTER TABLE acc_invoices ADD COLUMN IF NOT EXISTS carrier_id TEXT;
ALTER TABLE acc_invoices ADD COLUMN IF NOT EXISTS love_code TEXT;
ALTER TABLE acc_invoices ADD COLUMN IF NOT EXISTS npo_ban TEXT;

-- 3. 為 company_settings 新增光貿設定欄位
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS guangmao_enabled BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS guangmao_vault_secret_id UUID;  -- Supabase Vault reference
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS guangmao_tax_id TEXT;  -- 統一編號 (備份)

-- 4. 設定 RLS Policies (比照現有規則)
ALTER TABLE acc_invoice_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice requests of their companies"
  ON acc_invoice_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = acc_invoice_requests.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.is_active = true
    )
  );

CREATE POLICY "Users can manage invoice requests of their companies"
  ON acc_invoice_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = acc_invoice_requests.company_id
      AND company_members.user_id = auth.uid()
      AND company_members.is_active = true
    )
  );

-- 添加更新時間觸發器 (假設專案已有此函數)
-- 如果專案已有 update_updated_at_column，直接引用
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_acc_invoice_requests_updated_at
        BEFORE UPDATE ON acc_invoice_requests
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 5. RPC 函式：管理光貿金鑰 (使用 Vault)
-- 此函式僅能由 service_role 調用
CREATE OR REPLACE FUNCTION set_guangmao_secret(
  p_company_id UUID,
  p_app_key TEXT
)
RETURNS UUID AS $$
DECLARE
  v_secret_id UUID;
  v_secret_name TEXT;
BEGIN
  v_secret_name := 'guangmao_app_key_' || p_company_id::TEXT;
  
  -- 檢查是否已存在
  SELECT id INTO v_secret_id FROM vault.secrets WHERE name = v_secret_name;
  
  IF v_secret_id IS NOT NULL THEN
    -- 更新
    UPDATE vault.secrets SET secret = p_app_key WHERE id = v_secret_id;
  ELSE
    -- 新增
    SELECT vault.create_secret(p_app_key, v_secret_name, 'Guangmao APP KEY for company ' || p_company_id::TEXT) INTO v_secret_id;
  END IF;
  
  RETURN v_secret_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC 函式：獲取光貿金鑰（含公司歸屬驗證）
CREATE OR REPLACE FUNCTION get_guangmao_secret(
  p_secret_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_app_key TEXT;
  v_company_id UUID;
BEGIN
  -- 驗證此 secret 確實屬於呼叫者所屬的公司
  SELECT cs.company_id INTO v_company_id
  FROM company_settings cs
  WHERE cs.guangmao_vault_secret_id = p_secret_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Invalid secret reference';
  END IF;

  -- 檢查呼叫者是否屬於該公司（service_role 跳過此檢查）
  IF current_setting('role', true) != 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM company_members
      WHERE company_id = v_company_id
        AND user_id = auth.uid()
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Access denied: not a member of this company';
    END IF;
  END IF;

  SELECT decrypted_secret INTO v_app_key FROM vault.decrypted_secrets WHERE id = p_secret_id;
  RETURN v_app_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE acc_invoice_requests IS '發票請求佇列，用於處理與光貿 API 的非同步整合';
