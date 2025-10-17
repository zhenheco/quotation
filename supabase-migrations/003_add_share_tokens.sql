-- ========================================
-- 分享連結功能 (Share Tokens)
-- 用於生成公開的報價單分享連結
-- ========================================

-- ========================================
-- 1. Share tokens table (分享令牌表)
-- ========================================
CREATE TABLE IF NOT EXISTS share_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  token VARCHAR(64) UNIQUE NOT NULL, -- 隨機生成的唯一 token
  is_active BOOLEAN NOT NULL DEFAULT true, -- 是否啟用
  expires_at TIMESTAMP WITH TIME ZONE, -- 過期時間（可選）
  view_count INTEGER NOT NULL DEFAULT 0, -- 查看次數統計
  last_viewed_at TIMESTAMP WITH TIME ZONE, -- 最後查看時間
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- Create indexes for better performance
-- ========================================
CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_quotation_id ON share_tokens(quotation_id);
CREATE INDEX IF NOT EXISTS idx_share_tokens_is_active ON share_tokens(is_active);

-- ========================================
-- Apply updated_at trigger
-- ========================================
DROP TRIGGER IF EXISTS update_share_tokens_updated_at ON share_tokens;
CREATE TRIGGER update_share_tokens_updated_at BEFORE UPDATE ON share_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS
ALTER TABLE share_tokens ENABLE ROW LEVEL SECURITY;

-- 使用者可以查看自己報價單的分享令牌
DROP POLICY IF EXISTS "Users can view share tokens for their quotations" ON share_tokens;
CREATE POLICY "Users can view share tokens for their quotations"
  ON share_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = share_tokens.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 使用者可以建立自己報價單的分享令牌
DROP POLICY IF EXISTS "Users can create share tokens for their quotations" ON share_tokens;
CREATE POLICY "Users can create share tokens for their quotations"
  ON share_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = share_tokens.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 使用者可以更新自己報價單的分享令牌
DROP POLICY IF EXISTS "Users can update share tokens for their quotations" ON share_tokens;
CREATE POLICY "Users can update share tokens for their quotations"
  ON share_tokens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = share_tokens.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 使用者可以刪除自己報價單的分享令牌
DROP POLICY IF EXISTS "Users can delete share tokens for their quotations" ON share_tokens;
CREATE POLICY "Users can delete share tokens for their quotations"
  ON share_tokens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = share_tokens.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 匿名用戶可以查看有效的分享令牌（用於公開分享頁面）
-- 注意：這裡只允許查看 share_tokens 表本身，不包括報價單內容
-- 報價單內容的存取將在應用層面控制
DROP POLICY IF EXISTS "Anonymous users can view active share tokens" ON share_tokens;
CREATE POLICY "Anonymous users can view active share tokens"
  ON share_tokens FOR SELECT
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- 匿名用戶可以更新查看次數和最後查看時間
DROP POLICY IF EXISTS "Anonymous users can update view stats" ON share_tokens;
CREATE POLICY "Anonymous users can update view stats"
  ON share_tokens FOR UPDATE
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()))
  WITH CHECK (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- ========================================
-- Helper function: Generate random token
-- ========================================
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(64) AS $$
DECLARE
  new_token VARCHAR(64);
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- 生成 64 字元的隨機 token (使用 URL-safe 字元)
    new_token := encode(gen_random_bytes(32), 'base64');
    new_token := replace(replace(replace(new_token, '+', '-'), '/', '_'), '=', '');
    new_token := substring(new_token, 1, 64);

    -- 檢查 token 是否已存在
    SELECT EXISTS(SELECT 1 FROM share_tokens WHERE token = new_token) INTO token_exists;

    -- 如果不存在則跳出迴圈
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 完成！
-- ========================================
