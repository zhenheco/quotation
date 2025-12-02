-- Migration: Company Invitations
-- Description: 建立公司邀請連結系統
-- Created: 2024-12-02

-- 公司邀請連結表
CREATE TABLE IF NOT EXISTS company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  role_id UUID NOT NULL REFERENCES roles(id),
  created_by UUID NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：加速邀請碼查詢
CREATE INDEX IF NOT EXISTS idx_invitations_code ON company_invitations(invite_code) WHERE is_active = true;

-- 索引：按公司查詢邀請
CREATE INDEX IF NOT EXISTS idx_invitations_company ON company_invitations(company_id);

-- 索引：按建立者查詢
CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON company_invitations(created_by);

COMMENT ON TABLE company_invitations IS '公司邀請連結表';
COMMENT ON COLUMN company_invitations.invite_code IS '32 字元隨機邀請碼';
COMMENT ON COLUMN company_invitations.role_id IS '被邀請者的預設角色';
COMMENT ON COLUMN company_invitations.expires_at IS '過期時間（預設 7 天）';
COMMENT ON COLUMN company_invitations.max_uses IS '最大使用次數（預設 1）';
COMMENT ON COLUMN company_invitations.used_count IS '已使用次數';
COMMENT ON COLUMN company_invitations.is_active IS '是否有效（可手動撤銷）';
