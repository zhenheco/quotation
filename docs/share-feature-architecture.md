# 報價單分享功能 - 系統架構

## 架構概覽

```
┌─────────────────────────────────────────────────────────────────┐
│                        使用者介面層                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  QuotationDetail │         │   ShareButton    │            │
│  │   (管理員視圖)    │◄────────┤   (生成/管理)    │            │
│  └──────────────────┘         └──────────────────┘            │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │  /share/[token]  │         │SharedQuotationView│            │
│  │   (公開頁面)      │◄────────┤   (展示報價單)    │            │
│  └──────────────────┘         └──────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API 路由層                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST   /api/quotations/[id]/share    ─►  生成分享連結         │
│  GET    /api/quotations/[id]/share    ─►  取得分享狀態         │
│  DELETE /api/quotations/[id]/share    ─►  停用分享連結         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase 資料層                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │  quotations  │      │share_tokens  │      │  customers   │ │
│  │              │◄─────┤              │      │              │ │
│  │  - id        │      │ - token      │      │  - name      │ │
│  │  - number    │      │ - is_active  │      │  - email     │ │
│  │  - status    │      │ - expires_at │      │  - address   │ │
│  │  ...         │      │ - view_count │      │  ...         │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐                        │
│  │quotation_items│      │   products   │                        │
│  │              │      │              │                        │
│  │  - quantity  │      │  - name      │                        │
│  │  - unit_price│      │  - price     │                        │
│  │  ...         │      │  ...         │                        │
│  └──────────────┘      └──────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 資料流程

### 1. 生成分享連結流程

```
管理員                API                  資料庫               Helper Function
  │                   │                     │                      │
  │ 點擊「分享」       │                     │                      │
  ├──────────────────►│                     │                      │
  │                   │ 驗證用戶身份         │                      │
  │                   ├────────────────────►│                      │
  │                   │                     │                      │
  │                   │ 檢查現有 token      │                      │
  │                   ├────────────────────►│                      │
  │                   │◄────────────────────┤                      │
  │                   │                     │                      │
  │                   │ 生成新 token        │                      │
  │                   ├──────────────────────────────────────────►│
  │                   │◄──────────────────────────────────────────┤
  │                   │                     │                      │
  │                   │ 儲存 token          │                      │
  │                   ├────────────────────►│                      │
  │                   │◄────────────────────┤                      │
  │                   │                     │                      │
  │◄──────────────────┤ 返回分享 URL        │                      │
  │                   │                     │                      │
```

### 2. 查看分享頁面流程

```
訪客                 分享頁面               資料庫
  │                     │                     │
  │ 開啟分享連結         │                     │
  ├────────────────────►│                     │
  │                     │ 驗證 token          │
  │                     ├────────────────────►│
  │                     │◄────────────────────┤
  │                     │                     │
  │                     │ 查詢報價單資料       │
  │                     ├────────────────────►│
  │                     │◄────────────────────┤
  │                     │                     │
  │                     │ 更新查看統計         │
  │                     ├────────────────────►│
  │                     │                     │
  │◄────────────────────┤ 渲染報價單          │
  │                     │                     │
```

### 3. 停用分享連結流程

```
管理員                API                  資料庫
  │                   │                     │
  │ 點擊「停用」       │                     │
  ├──────────────────►│                     │
  │                   │ 驗證用戶身份         │
  │                   ├────────────────────►│
  │                   │◄────────────────────┤
  │                   │                     │
  │                   │ 更新 is_active=false│
  │                   ├────────────────────►│
  │                   │◄────────────────────┤
  │                   │                     │
  │◄──────────────────┤ 返回成功訊息         │
  │                   │                     │
```

## 安全機制

### Row Level Security (RLS) 策略

```sql
-- 1. 管理員可以查看自己報價單的 token
CREATE POLICY "Users can view share tokens for their quotations"
  ON share_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = share_tokens.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 2. 管理員可以建立自己報價單的 token
CREATE POLICY "Users can create share tokens for their quotations"
  ON share_tokens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotations
      WHERE quotations.id = share_tokens.quotation_id
      AND quotations.user_id = auth.uid()
    )
  );

-- 3. 匿名用戶可以查看有效的 token（用於驗證）
CREATE POLICY "Anonymous users can view active share tokens"
  ON share_tokens FOR SELECT
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

-- 4. 匿名用戶可以更新查看統計
CREATE POLICY "Anonymous users can update view stats"
  ON share_tokens FOR UPDATE
  TO anon
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()))
  WITH CHECK (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));
```

## Token 生成演算法

```sql
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(64) AS $$
DECLARE
  new_token VARCHAR(64);
  token_exists BOOLEAN;
BEGIN
  LOOP
    -- 1. 生成 32 bytes 的隨機資料
    new_token := encode(gen_random_bytes(32), 'base64');

    -- 2. 轉換為 URL-safe 格式
    new_token := replace(replace(replace(new_token, '+', '-'), '/', '_'), '=', '');

    -- 3. 截取前 64 字元
    new_token := substring(new_token, 1, 64);

    -- 4. 檢查唯一性
    SELECT EXISTS(SELECT 1 FROM share_tokens WHERE token = new_token) INTO token_exists;

    -- 5. 如果不存在則返回
    IF NOT token_exists THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN new_token;
END;
$$ LANGUAGE plpgsql;
```

## 組件關係圖

```
┌─────────────────────────────────────────────────┐
│           QuotationDetail.tsx                   │
│  (報價單詳情頁 - Client Component)               │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │        ShareButton.tsx                  │   │
│  │  (分享按鈕 - Client Component)          │   │
│  │                                          │   │
│  │  - 開啟分享對話框                        │   │
│  │  - 生成分享連結                          │   │
│  │  - 複製連結到剪貼簿                      │   │
│  │  - 停用分享連結                          │   │
│  │  - 顯示查看統計                          │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        │
                        │ 呼叫 API
                        ▼
┌─────────────────────────────────────────────────┐
│     /api/quotations/[id]/share/route.ts         │
│  (API 路由)                                      │
│                                                  │
│  - POST: 生成分享連結                            │
│  - GET: 取得分享狀態                             │
│  - DELETE: 停用分享連結                          │
└─────────────────────────────────────────────────┘
                        │
                        │ 存取資料庫
                        ▼
┌─────────────────────────────────────────────────┐
│            Supabase PostgreSQL                   │
│                                                  │
│  - share_tokens 表                               │
│  - quotations 表                                 │
│  - RLS Policies                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│       /share/[token]/page.tsx                    │
│  (公開分享頁 - Server Component)                 │
│                                                  │
│  1. 驗證 token                                   │
│  2. 查詢報價單資料                               │
│  3. 更新查看統計                                 │
│  4. 渲染 SharedQuotationView                     │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │   SharedQuotationView.tsx               │   │
│  │  (報價單展示 - Client Component)         │   │
│  │                                          │   │
│  │  - 顯示報價單資訊                        │   │
│  │  - 中英文切換                            │   │
│  │  - 響應式佈局                            │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 效能考量

### 1. Server Components
- `/share/[token]/page.tsx` 使用 Server Component
- 減少客戶端 JavaScript
- 更快的首次載入時間
- SEO 友好

### 2. 資料庫索引
```sql
CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_quotation_id ON share_tokens(quotation_id);
CREATE INDEX idx_share_tokens_is_active ON share_tokens(is_active);
```

### 3. 非同步更新
- 查看統計更新採用非阻塞方式
- 不影響頁面載入速度

### 4. 快取策略
- 考慮使用 CDN 快取靜態資源
- 適當設定瀏覽器快取策略

## 擴展性設計

系統架構支援以下擴展：

1. **多層級權限**：可擴展為需要密碼的私密分享
2. **進階統計**：可記錄 IP、裝置、瀏覽器等資訊
3. **互動功能**：客戶可在分享頁面進行操作（接受/拒絕）
4. **通知機制**：整合 Webhook 支援即時通知
5. **QR Code**：可整合 QR Code 生成庫

## 相關技術文件

- [Next.js 15 文件](https://nextjs.org/docs)
- [Supabase RLS 指南](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL UUID 函數](https://www.postgresql.org/docs/current/functions-uuid.html)

---

**最後更新**: 2025-10-17
**版本**: 1.0.0
