# 資料庫遷移架構設計

## Context

當前系統同時使用 Zeabur PostgreSQL 和 Supabase PostgreSQL，造成架構複雜、成本高昂（$40-45/月）、效能瓶頸（API 回應 150-200ms），且存在安全性問題（密鑰洩漏）。需要遷移到統一且高效的資料平台。

**關鍵約束**:
- 必須保留 Supabase Auth（OAuth、Email 驗證、密碼重設）
- 需要支援全球使用者（低延遲）
- 預算限制：免費或接近免費
- 不能有長時間停機

**主要利害關係人**:
- 開發團隊：需要簡單易維護的架構
- 使用者：期待更快的回應時間
- 財務：希望降低成本

---

## Goals / Non-Goals

### Goals
1. ✅ **簡化架構**: 從雙資料庫整合到單一平台（Cloudflare）
2. ✅ **提升效能**: API p95 回應時間 < 100ms（改善 50%）
3. ✅ **降低成本**: 100% 使用免費額度（節省 $40-45/月）
4. ✅ **增強安全**: 清理所有洩漏的密鑰，改用 Cloudflare Secrets
5. ✅ **全球部署**: 利用 Cloudflare Edge 網路
6. ✅ **保持穩定**: 認證系統零改動，完整回滾機制

### Non-Goals
- ❌ 不重新設計認證系統（保留 Supabase Auth）
- ❌ 不遷移到其他雲端平台（AWS/GCP/Azure）
- ❌ 不實作複雜的資料同步（單向遷移）
- ❌ 不支援即時協作功能（超出當前需求）

---

## Decisions

### Decision 1: 選擇 Cloudflare D1 作為主資料庫

**理由**:
- ✅ **完全免費**（10萬次讀取/天）足夠當前規模
- ✅ **全球分佈**（自動複製到 300+ 邊緣位置）
- ✅ **與 Workers 無縫整合**（已使用 OpenNext on Cloudflare）
- ✅ **SQLite 語法**（簡單、可預測、性能優異）
- ✅ **內建備份**（每日自動備份）

**替代方案考慮**:

| 方案 | 優點 | 缺點 | 拒絕原因 |
|------|------|------|---------|
| **Supabase PostgreSQL** | 功能完整、免費額度大 | 無法整合 KV、延遲較高 | 效能未達標 |
| **Turso (LibSQL)** | 全球邊緣複製、相容 SQLite | 免費額度有限 | 長期成本風險 |
| **PlanetScale** | MySQL 相容、無伺服器 | 免費方案限制多 | 架構不一致 |
| **Neon PostgreSQL** | 無伺服器 Postgres | 冷啟動延遲 | 效能問題 |

---

### Decision 2: 使用 Cloudflare KV 作為快取層

**理由**:
- ✅ **極低延遲**（全球邊緣讀取 < 5ms）
- ✅ **免費額度充足**（10萬次讀取/天）
- ✅ **自動全球複製**（60 秒內同步）
- ✅ **簡單的 key-value API**
- ✅ **與 D1 完美互補**

**快取策略**:

| 資料類型 | 是否快取 | TTL | 理由 |
|---------|---------|-----|------|
| 匯率 | ✅ 必須 | 24小時 | 每日更新1次，讀取極頻繁 |
| 使用者權限 | ✅ 必須 | 1小時 | 每次請求檢查，變更不頻繁 |
| 公司設定 | ✅ 推薦 | 2小時 | PDF生成需要，極少變更 |
| 產品列表 | 🔸 可選 | 30分鐘 | 讀取頻繁但價格可能更新 |
| 客戶資料 | ❌ 不快取 | N/A | 資料量大，變更頻繁 |
| 報價單 | ❌ 不快取 | N/A | 即時性要求高 |
| 付款交易 | ❌ 不快取 | N/A | 強一致性需求 |

**替代方案考慮**:
- Redis（需額外費用，過度設計）
- Cloudflare Durable Objects（複雜度高，非快取用途）
- Workers Cache API（僅限 HTTP 快取）

---

### Decision 3: 保留 Supabase Auth

**理由**:
- ✅ **免費額度充足**（5萬 MAU）
- ✅ **功能完整**（OAuth、Email、密碼重設）
- ✅ **已整合完成**（零改動成本）
- ✅ **JWT 標準**（與 Workers 相容）
- ✅ **風險最低**（認證是關鍵系統）

**不遷移認證的原因**:
- Cloudflare Access 需要付費方案
- 自建認證風險太高（安全性、功能完整性）
- 混合架構可接受（認證 vs 資料分離是常見模式）

---

### Decision 4: 應用層權限檢查取代 RLS

**理由**:
- ✅ D1 不支援 Row Level Security（SQLite 限制）
- ✅ 應用層檢查更靈活（複雜權限邏輯）
- ✅ 可使用 KV 快取（減少查詢次數）
- ✅ TypeScript 型別安全（編譯期檢查）

**實作策略**:
```typescript
// 1. API 路由層：檢查權限
const permissions = await getUserPermissions(userId) // KV 快取
if (!permissions.includes('read:customers')) {
  return 403
}

// 2. DAL 層：強制 user_id 過濾
function getCustomers(db: D1Client, userId: string) {
  // userId 參數強制傳入（TypeScript）
  return db.query('SELECT * FROM customers WHERE user_id = ?', [userId])
}
```

**安全保障**:
- 所有 DAL 函式強制 userId 參數（TypeScript 型別）
- 審計日誌記錄所有敏感操作
- 權限快取 TTL 1 小時（變更後立即失效）

---

### Decision 5: Schema 轉換策略（PostgreSQL → SQLite）

**轉換規則**:

| PostgreSQL | SQLite | 處理方式 |
|-----------|--------|---------|
| `UUID` | `TEXT` | 使用 `crypto.randomUUID()` |
| `JSONB` | `TEXT` | `JSON.stringify()` / `JSON.parse()` |
| `DECIMAL(12,2)` | `REAL` | 浮點數（精度足夠） |
| `TIMESTAMP` | `TEXT` | ISO-8601 格式 |
| `INET` | `TEXT` | IP 字串 |
| `REFERENCES auth.users(id)` | 移除 | 應用層檢查 |

**範例**:
```sql
-- PostgreSQL
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SQLite (D1)
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,  -- JSON 字串
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
```

**JSON 處理**:
```typescript
// 寫入
const data = { zh: '客戶名稱', en: 'Customer Name' }
await db.execute(
  'INSERT INTO customers (id, name) VALUES (?, ?)',
  [id, JSON.stringify(data)]
)

// 讀取
const row = await db.queryOne('SELECT * FROM customers WHERE id = ?', [id])
const customer = {
  ...row,
  name: JSON.parse(row.name)
}
```

---

### Decision 6: 資料遷移策略

**方法**: 單向完整遷移（非雙寫、非增量同步）

**流程**:
1. 從 Supabase 導出（`pg_dump --data-only`）
2. 轉換格式（PostgreSQL → SQLite）
3. 導入 D1（本地測試 → 遠端部署）
4. 驗證完整性（記錄數比對）
5. 切換流量（更新環境變數）
6. 保留 Supabase 30 天（回滾視窗）

**為何不用雙寫**:
- 增加複雜度（需要同步邏輯）
- 額外成本（雙份資料庫）
- 不必要（一次性遷移可接受）

**為何不用增量同步**:
- 資料量不大（< 10 萬筆）
- 完整導入時間 < 10 分鐘
- CDC 複雜度高

---

## Risks / Trade-offs

### Risk 1: SQLite 功能限制 ⚠️ 中等
**問題**: 無 JSONB 操作符、無 RLS、無複雜查詢

**緩解**:
- 應用層處理 JSON（使用 TypeScript）
- 應用層權限檢查（使用 KV 快取）
- 簡化查詢邏輯（避免複雜 JOIN）
- 預先測試所有查詢

---

### Risk 2: D1 並發寫入限制 ⚠️ 低
**問題**: SQLite 寫入鎖定

**緩解**:
- 使用樂觀鎖定（版本號）
- 實作重試機制（指數退避）
- 批次操作使用 D1 batch API
- 監控寫入衝突（預期極低）

---

### Risk 3: KV 最終一致性 ⚠️ 中等
**問題**: 60 秒全球同步延遲

**緩解**:
- 寫入後主動失效快取
- 關鍵資料不使用 KV（如付款）
- 設定合理 TTL
- 使用者教育（權限變更可能延遲 1 小時）

---

### Risk 4: 資料遷移錯誤 ⚠️ 高
**問題**: 資料損壞或遺失

**緩解**:
- 完整備份 Supabase（保留 30 天）
- 多次測試遷移流程
- 逐表驗證記錄數
- 低流量時段執行
- < 5 分鐘快速回滾

---

### Trade-off 1: 效能 vs 複雜度
**選擇**: 接受 KV 快取複雜度，換取 80-98% 效能提升

**理由**: 快取失效邏輯清晰，收益遠大於成本

---

### Trade-off 2: 一致性 vs 成本
**選擇**: 接受 KV 最終一致性，換取零成本

**理由**: 非金融系統，1 小時延遲可接受

---

### Trade-off 3: 功能 vs 簡化
**選擇**: 放棄 PostgreSQL 進階功能，換取 SQLite 簡單性

**理由**: 當前需求不需要複雜功能，簡化更有價值

---

## Migration Plan

### Phase 1: 安全清理（1 小時，P0）
1. 檢查 Git 歷史洩漏
2. 撤銷 Zeabur API Token
3. 清理硬編碼密鑰
4. 清理 Git 歷史（BFG）

### Phase 2: Zeabur 清理（3 小時）
1. 刪除 Zeabur 相關程式碼
2. 更新所有引用
3. 歸檔文檔

### Phase 3: D1 建立（10 小時）
1. 建立 D1 資料庫
2. 轉換 Schema
3. 建立 DAL 層（8 個實體）
4. 建立 D1 客戶端

### Phase 4: KV 整合（9 小時）
1. 建立 KV namespace
2. 實作快取抽象層
3. 實作快取服務（匯率、權限、公司）

### Phase 5: 服務層更新（7 小時）
1. 更新服務層（5 個檔案）
2. 更新 API 路由（35+ 個檔案）

### Phase 6: 資料遷移（4 小時）
1. 導出 Supabase 資料
2. 轉換格式
3. 導入 D1
4. 驗證完整性

### Phase 7: 測試（6 小時）
1. 單元測試（DAL、快取）
2. 本地整合測試
3. 測試環境部署

### Phase 8: 生產部署（2 小時）
1. 最終檢查
2. 部署
3. 監控驗證

**總時間**: 40 小時（1-2 週）

### Rollback Plan

**情境 1: 測試階段發現問題**
- 停止 D1 操作
- 切換回 Supabase
- 時間: 10 分鐘

**情境 2: 生產環境問題**
- 立即切換環境變數
- 重新部署舊版本
- 時間: < 5 分鐘

**情境 3: 資料不一致**
- 從備份恢復 Supabase
- 時間: 30 分鐘

---

## Open Questions

1. **Q**: D1 免費額度是否足夠 1 年後使用？
   - **A**: 目前用量僅 10%，即使成長 10 倍仍在免費額度內。若超過可升級 Workers Paid（$5/月）。

2. **Q**: KV 快取是否會造成資料不一致問題？
   - **A**: 設定合理 TTL + 寫入後失效策略。非金融系統可接受 1 小時延遲。

3. **Q**: SQLite 是否支援未來的複雜查詢需求？
   - **A**: 當前需求簡單。若需要複雜分析，可使用 Cloudflare Analytics Engine 或外部 OLAP。

4. **Q**: 如何處理大量寫入的情況？
   - **A**: 使用 D1 batch API + 重試機制。監控寫入衝突，預期極低。

5. **Q**: 遷移過程是否需要停機？
   - **A**: 不需要。使用環境變數切換，< 1 秒停機時間。
