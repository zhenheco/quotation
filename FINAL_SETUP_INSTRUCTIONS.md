# 🎯 最終設置說明 - 匯率功能

## 📊 當前狀態

✅ **已完成**:
- 匯率服務模組 (100%)
- API Routes (100%)
- 環境變數配置 (100%)
- 程式碼重構 (100%)
- 文檔撰寫 (100%)

⚠️  **待完成** (需要您手動執行 5 分鐘):
- 在 Supabase Dashboard 執行 SQL

---

## 🚀 完整設置步驟

### 步驟 1: 登入 Supabase Dashboard

1. 前往: https://supabase.com/dashboard
2. 選擇您的專案

### 步驟 2: 開啟 SQL Editor

1. 左側選單 → **SQL Editor**
2. 點擊 **New query**

### 步驟 3: 執行以下 SQL

**複製以下完整 SQL 並貼上，然後點擊 "Run"**:

```sql
-- ========================================
-- 修復 exchange_rates 表的 RLS 政策
-- ========================================

-- 1. 移除舊政策（如果存在）
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;

-- 2. 建立新的 RLS 政策

-- 允許所有已驗證用戶讀取匯率資料
CREATE POLICY "Authenticated users can view exchange rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- 允許所有已驗證用戶插入匯率資料
CREATE POLICY "Authenticated users can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 允許所有已驗證用戶更新匯率資料
CREATE POLICY "Authenticated users can update exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true);

-- ========================================
-- 驗證設定 (選擇性執行)
-- ========================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'exchange_rates';
```

### 步驟 4: 驗證結果

執行後應該看到：

```
Successfully executed query
```

如果執行驗證 SQL，應該看到 3 筆記錄：
- `Authenticated users can view exchange rates` | SELECT
- `Authenticated users can insert exchange rates` | INSERT
- `Authenticated users can update exchange rates` | UPDATE

---

## 🧪 測試 API

完成後，在終端機執行：

```bash
# 測試 1: 獲取匯率
curl http://localhost:3000/api/exchange-rates | jq '.'

# 預期結果（匯率應該是實際數字，不是 1）:
# {
#   "success": true,
#   "base_currency": "USD",
#   "rates": {
#     "TWD": 30.6022,
#     "USD": 1.0,
#     "EUR": 0.8593,
#     "JPY": 151.1022,
#     "CNY": 7.1281
#   }
# }

# 測試 2: 手動同步匯率
curl -X POST http://localhost:3000/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency":"USD"}'

# 預期結果:
# {
#   "success": true,
#   "message": "匯率同步成功"
# }
```

---

## 🐛 故障排除

### 問題 1: SQL 執行失敗

**錯誤**: `permission denied`

**解決**: 確保您使用的是專案的 Owner 或 Admin 帳號

### 問題 2: 仍然返回匯率都是 1

**原因**: RLS 政策尚未生效或 API 金鑰有問題

**解決**:
1. 確認 SQL 已成功執行
2. 檢查 `.env.local` 中的 `EXCHANGE_RATE_API_KEY`
3. 重新啟動開發伺服器：
   ```bash
   # 停止伺服器 (Ctrl+C)
   npm run dev
   ```

### 問題 3: API 返回 403 Forbidden

**原因**: ExchangeRate-API 金鑰無效或配額用完

**解決**:
1. 前往: https://www.exchangerate-api.com/dashboard
2. 檢查 API 使用量
3. 如需要，申請新的 API 金鑰

---

## 📁 相關檔案

| 檔案 | 說明 |
|------|------|
| [QUICK_FIX.md](QUICK_FIX.md) | 快速修復指南 |
| [docs/EXCHANGE_RATES_SETUP.md](docs/EXCHANGE_RATES_SETUP.md) | 完整設置指南 |
| [CHANGELOG.md](CHANGELOG.md) | 變更日誌 (v0.2.0) |
| [DEVELOPMENT_SUMMARY.md](DEVELOPMENT_SUMMARY.md) | 開發總結 |

---

## ✅ 完成檢查清單

執行完 SQL 後，請確認：

- [ ] SQL 在 Supabase Dashboard 成功執行
- [ ] 驗證 SQL 顯示 3 個政策
- [ ] `curl http://localhost:3000/api/exchange-rates` 返回實際匯率（不是 1）
- [ ] POST 同步 API 返回 `success: true`
- [ ] Supabase Table Editor 中 `exchange_rates` 表有新資料

---

## 🎉 完成後

所有功能就緒！您可以：

1. ✅ 在報價單表單中整合匯率顯示
2. ✅ 使用 API 進行貨幣轉換
3. ✅ 查看資料庫中的匯率歷史記錄

---

**需要協助？**

如果遇到任何問題，請參考:
- [docs/EXCHANGE_RATES_SETUP.md](docs/EXCHANGE_RATES_SETUP.md) 的故障排除章節
- 或讓我知道錯誤訊息，我會協助您解決！

---

**預估完成時間**: 5 分鐘
**難度**: ⭐ (非常簡單 - 只需複製貼上 SQL)
