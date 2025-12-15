-- ============================================================================
-- Migration: 046_security_audit.sql
-- Created: 2025-12-15
-- Description: 建立安全審計與資安強化表格
-- Source: Account-system Prisma Schema
-- ============================================================================

-- ============================================================================
-- 1. 審計日誌 (Audit Logs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id),
  user_id UUID,
  session_id UUID,

  -- 操作資訊
  action audit_action NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(50),

  -- 變更內容
  old_value JSONB,
  new_value JSONB,

  -- 來源資訊
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  device_id UUID,

  -- 狀態
  status audit_status DEFAULT 'SUCCESS',
  message VARCHAR(500),

  -- 時間戳（不可修改）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

COMMENT ON TABLE audit_logs IS '審計日誌';

-- ============================================================================
-- 2. 安全事件 (Security Events)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID,

  -- 事件資訊
  event_type security_event_type NOT NULL,
  severity security_severity DEFAULT 'LOW',

  -- 詳細資訊
  description VARCHAR(500) NOT NULL,
  details JSONB,

  -- 來源
  ip_address VARCHAR(45),
  device_id UUID,

  -- 處理狀態
  status security_event_status DEFAULT 'OPEN',
  resolved_at TIMESTAMPTZ,
  resolved_by VARCHAR(50),
  resolution VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_tenant_created ON security_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_status ON security_events(status);

COMMENT ON TABLE security_events IS '安全事件';

-- ============================================================================
-- 3. POS 終端裝置 (Devices)
-- ============================================================================

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID NOT NULL REFERENCES branches(id),

  -- 裝置資訊
  device_name VARCHAR(100) NOT NULL,
  device_type device_type DEFAULT 'POS_TERMINAL',
  fingerprint VARCHAR(256) UNIQUE NOT NULL,

  -- 認證資訊
  certificate_id VARCHAR(100),
  certificate_exp TIMESTAMPTZ,
  public_key TEXT,

  -- 狀態
  status device_status DEFAULT 'PENDING',
  last_active_at TIMESTAMPTZ,
  last_ip_address VARCHAR(45),

  -- 管理
  registered_by VARCHAR(50),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_by VARCHAR(50),
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_tenant ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_branch ON devices(branch_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(fingerprint);

COMMENT ON TABLE devices IS 'POS 終端裝置';

-- ============================================================================
-- 4. 裝置 Session (Device Sessions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id),
  user_id UUID NOT NULL,

  -- Session 資訊
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- 活動追蹤
  last_activity_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),

  -- 狀態
  is_active BOOLEAN DEFAULT true,
  terminated_at TIMESTAMPTZ,
  terminate_reason VARCHAR(200),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_user ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_is_active ON device_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_device_sessions_expires ON device_sessions(expires_at);

COMMENT ON TABLE device_sessions IS '裝置 Session';

-- ============================================================================
-- 5. 臨時權限 (Temporary Permissions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS temporary_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- 權限範圍
  granted_to UUID NOT NULL,
  granted_by UUID NOT NULL,
  permission VARCHAR(100) NOT NULL,

  -- 條件限制
  max_amount NUMERIC(12,2),
  max_usages INTEGER,
  usage_count INTEGER DEFAULT 0,

  -- 有效期間
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- 驗證方式
  require_pin BOOLEAN DEFAULT true,
  require_otp BOOLEAN DEFAULT false,

  -- 狀態
  status temp_permission_status DEFAULT 'ACTIVE',
  reason VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_temp_permissions_tenant ON temporary_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_temp_permissions_granted_to ON temporary_permissions(granted_to);
CREATE INDEX IF NOT EXISTS idx_temp_permissions_status ON temporary_permissions(status);
CREATE INDEX IF NOT EXISTS idx_temp_permissions_expires ON temporary_permissions(expires_at);

COMMENT ON TABLE temporary_permissions IS '臨時權限';

-- ============================================================================
-- 6. 加密金鑰 (Encryption Keys - for KMS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),

  -- 金鑰資訊
  key_alias VARCHAR(100) NOT NULL,
  key_type key_type DEFAULT 'AES_256_GCM',
  key_version INTEGER DEFAULT 1,

  -- 金鑰儲存（加密後的 DEK）
  encrypted_key TEXT NOT NULL,
  iv VARCHAR(64) NOT NULL,

  -- 狀態
  status key_status DEFAULT 'ACTIVE',
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, key_alias)
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_tenant ON encryption_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_status ON encryption_keys(status);

COMMENT ON TABLE encryption_keys IS '加密金鑰（KMS）';

-- ============================================================================
-- 7. IP 黑名單 (IP Blocklist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ip_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- IP 資訊
  ip_address VARCHAR(45) UNIQUE NOT NULL,
  ip_range VARCHAR(50),

  -- 封鎖資訊
  reason VARCHAR(500) NOT NULL,
  blocked_by VARCHAR(50),

  -- 有效期間
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_ip_blocklist_ip ON ip_blocklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_is_active ON ip_blocklist(is_active);

COMMENT ON TABLE ip_blocklist IS 'IP 黑名單';

-- ============================================================================
-- 8. 使用者 PIN (User PINs - for 二次驗證)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,

  -- PIN 資訊（bcrypt hash）
  pin_hash VARCHAR(100) NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

COMMENT ON TABLE user_pins IS '使用者 PIN（二次驗證）';

-- ============================================================================
-- 9. 同意書紀錄 (Consent Records - GDPR 合規)
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES pos_members(id),

  -- 同意類型
  consent_type consent_type NOT NULL,
  version VARCHAR(20) NOT NULL,

  -- 同意資訊
  is_granted BOOLEAN NOT NULL,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- 來源
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_member ON consent_records(member_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);

COMMENT ON TABLE consent_records IS '同意書紀錄（GDPR）';

-- ============================================================================
-- 10. RLS 政策
-- ============================================================================

-- 啟用 RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

-- audit_logs RLS（租戶隔離 + Super Admin）
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (
    (tenant_id IS NULL AND is_super_admin())
    OR can_access_tenant_rls(tenant_id)
    OR is_super_admin()
  );

CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- security_events RLS
CREATE POLICY "security_events_select" ON security_events
  FOR SELECT USING (
    can_access_tenant_rls(tenant_id) OR is_super_admin()
  );

CREATE POLICY "security_events_insert" ON security_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "security_events_update" ON security_events
  FOR UPDATE USING (
    can_access_tenant_rls(tenant_id) OR is_super_admin()
  );

-- devices RLS
CREATE POLICY "devices_select" ON devices
  FOR SELECT USING (
    can_access_tenant_rls(tenant_id) OR is_super_admin()
  );

CREATE POLICY "devices_insert" ON devices
  FOR INSERT WITH CHECK (
    can_access_tenant_rls(tenant_id)
  );

CREATE POLICY "devices_update" ON devices
  FOR UPDATE USING (
    can_access_tenant_rls(tenant_id) OR is_super_admin()
  );

CREATE POLICY "devices_delete" ON devices
  FOR DELETE USING (
    can_access_tenant_rls(tenant_id) OR is_super_admin()
  );

-- device_sessions RLS
CREATE POLICY "device_sessions_select" ON device_sessions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM devices d
      WHERE d.id = device_id
        AND can_access_tenant_rls(d.tenant_id)
    )
    OR is_super_admin()
  );

CREATE POLICY "device_sessions_insert" ON device_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices d
      WHERE d.id = device_id
        AND can_access_tenant_rls(d.tenant_id)
    )
  );

CREATE POLICY "device_sessions_update" ON device_sessions
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM devices d
      WHERE d.id = device_id
        AND can_access_tenant_rls(d.tenant_id)
    )
    OR is_super_admin()
  );

-- temporary_permissions RLS
CREATE POLICY "temp_permissions_select" ON temporary_permissions
  FOR SELECT USING (
    granted_to = auth.uid()
    OR granted_by = auth.uid()
    OR can_access_tenant_rls(tenant_id)
    OR is_super_admin()
  );

CREATE POLICY "temp_permissions_insert" ON temporary_permissions
  FOR INSERT WITH CHECK (
    can_access_tenant_rls(tenant_id)
  );

CREATE POLICY "temp_permissions_update" ON temporary_permissions
  FOR UPDATE USING (
    granted_by = auth.uid()
    OR can_access_tenant_rls(tenant_id)
    OR is_super_admin()
  );

-- encryption_keys RLS（嚴格限制）
CREATE POLICY "encryption_keys_select" ON encryption_keys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.tenant_id = tenant_id
        AND ut.user_id = auth.uid()
        AND ut.role = 'OWNER'
    )
    OR is_super_admin()
  );

CREATE POLICY "encryption_keys_insert" ON encryption_keys
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenants ut
      WHERE ut.tenant_id = tenant_id
        AND ut.user_id = auth.uid()
        AND ut.role = 'OWNER'
    )
    OR is_super_admin()
  );

CREATE POLICY "encryption_keys_update" ON encryption_keys
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "encryption_keys_delete" ON encryption_keys
  FOR DELETE USING (is_super_admin());

-- ip_blocklist RLS（只有 Super Admin）
CREATE POLICY "ip_blocklist_all" ON ip_blocklist
  FOR ALL USING (is_super_admin());

-- user_pins RLS（只有本人）
CREATE POLICY "user_pins_select" ON user_pins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_pins_insert" ON user_pins
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_pins_update" ON user_pins
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_pins_delete" ON user_pins
  FOR DELETE USING (user_id = auth.uid());

-- consent_records RLS（透過 member_id 繼承）
CREATE POLICY "consent_records_select" ON consent_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pos_members m
      WHERE m.id = member_id
        AND can_access_tenant_rls(m.tenant_id)
    )
    OR is_super_admin()
  );

CREATE POLICY "consent_records_insert" ON consent_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM pos_members m
      WHERE m.id = member_id
        AND can_access_tenant_rls(m.tenant_id)
    )
  );

-- ============================================================================
-- 11. 時間戳觸發器
-- ============================================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM (VALUES
      ('security_events'), ('devices'), ('encryption_keys'), ('user_pins')
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
-- 12. 審計日誌自動記錄函數
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action audit_action,
  p_resource_type VARCHAR(50),
  p_resource_id VARCHAR(50) DEFAULT NULL,
  p_old_value JSONB DEFAULT NULL,
  p_new_value JSONB DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    action,
    resource_type,
    resource_id,
    old_value,
    new_value,
    tenant_id,
    branch_id,
    user_id,
    status
  ) VALUES (
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_value,
    p_new_value,
    p_tenant_id,
    p_branch_id,
    auth.uid(),
    'SUCCESS'
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. 安全事件自動記錄函數
-- ============================================================================

CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type security_event_type,
  p_description VARCHAR(500),
  p_severity security_severity DEFAULT 'LOW',
  p_details JSONB DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_events (
    event_type,
    description,
    severity,
    details,
    tenant_id,
    user_id,
    ip_address
  ) VALUES (
    p_event_type,
    p_description,
    p_severity,
    p_details,
    p_tenant_id,
    auth.uid(),
    p_ip_address
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 14. PIN 驗證函數
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_user_pin(
  p_user_id UUID,
  p_pin VARCHAR(10)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pin_record RECORD;
  v_is_valid BOOLEAN;
BEGIN
  SELECT * INTO v_pin_record
  FROM user_pins
  WHERE user_id = p_user_id;

  IF v_pin_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 檢查是否鎖定
  IF v_pin_record.locked_until IS NOT NULL AND v_pin_record.locked_until > NOW() THEN
    RETURN FALSE;
  END IF;

  -- 使用 pgcrypto 驗證（假設 bcrypt）
  v_is_valid := (v_pin_record.pin_hash = crypt(p_pin, v_pin_record.pin_hash));

  IF v_is_valid THEN
    -- 重置失敗次數
    UPDATE user_pins
    SET failed_attempts = 0,
        locked_until = NULL,
        last_used_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- 增加失敗次數
    UPDATE user_pins
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE
          WHEN failed_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
          ELSE NULL
        END
    WHERE user_id = p_user_id;
  END IF;

  RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 15. 權限設定
-- ============================================================================

INSERT INTO permissions (resource, action, name, description) VALUES
  -- 審計日誌
  ('audit_logs', 'read', 'audit_logs:read', '檢視審計日誌'),
  -- 安全事件
  ('security_events', 'read', 'security_events:read', '檢視安全事件'),
  ('security_events', 'resolve', 'security_events:resolve', '處理安全事件'),
  -- 裝置管理
  ('devices', 'read', 'devices:read', '檢視裝置'),
  ('devices', 'write', 'devices:write', '管理裝置'),
  ('devices', 'revoke', 'devices:revoke', '撤銷裝置'),
  -- IP 黑名單
  ('ip_blocklist', 'read', 'ip_blocklist:read', '檢視 IP 黑名單'),
  ('ip_blocklist', 'write', 'ip_blocklist:write', '管理 IP 黑名單')
ON CONFLICT (name) DO NOTHING;

-- Super Admin：所有安全權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
  AND p.resource IN ('audit_logs', 'security_events', 'devices', 'ip_blocklist')
ON CONFLICT DO NOTHING;

-- Company Owner：審計日誌與裝置管理
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'company_owner'
  AND p.name IN (
    'audit_logs:read',
    'security_events:read', 'security_events:resolve',
    'devices:read', 'devices:write', 'devices:revoke'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 16. 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('046_security_audit.sql')
ON CONFLICT (filename) DO NOTHING;

NOTIFY pgrst, 'reload schema';

SELECT 'Security audit tables migration completed! 9 tables + helper functions created.' as status;
