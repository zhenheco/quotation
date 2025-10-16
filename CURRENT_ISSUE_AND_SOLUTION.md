# 🚨 當前問題與解決方案

**更新時間**: 2025-10-16 17:32

---

## 📊 當前狀態

### ✅ 已完成
- 匯率服務模組 (100%)
- API Routes (100%)
- 文檔 (100%)
- 架構說明 (100%)

### ⚠️  問題

#### 問題 1: 資料庫權限錯誤

```
❌ 從資料庫獲取匯率失敗: {
  code: '42501',
  message: 'permission denied for table exchange_rates'
}
```

**原因**: Zeabur PostgreSQL 的 `exchange_rates` 表缺少 RLS 政策

**影響**:
- 無法從資料庫讀取匯率
- 無法寫入新匯率到資料庫
- API 總是返回匯率 = 1

#### 問題 2: ExchangeRate-API 返回 403

```
❌ API 請求失敗: 403 Forbidden
```

**可能原因**:
1. API 金鑰無效
2. API 配額用完
3. API 伺服器暫時無法訪問

---

## ✅ 解決方案

### 解決問題 1: 資料庫權限 (必須執行)

#### 方法: 在 Zeabur PostgreSQL 容器內執行

**您已經 SSH 進入容器**: `root@service-68f09dcba21c4059789a53ae-bbb466748-vpbp2:/#`

#### 步驟 1: 進入 psql

```bash
# 嘗試以下其中一個指令:
psql $DATABASE_URL
# 或
psql postgres
# 或
psql -U postgres
```

#### 步驟 2: 執行 SQL (在 psql 內)

```sql
-- 移除舊政策
DROP POLICY IF EXISTS "Anyone can view exchange rates" ON exchange_rates;

-- 新增 SELECT 權限
CREATE POLICY "Authenticated users can view exchange_rates"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

-- 新增 INSERT 權限
CREATE POLICY "Authenticated users can insert exchange_rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 新增 UPDATE 權限
CREATE POLICY "Authenticated users can update exchange_rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true);

-- 驗證
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename = 'exchange_rates';

-- 退出
\q
```

#### 預期結果

應該看到 3 個政策:
```
 exchange_rates | Authenticated users can view exchange_rates  | SELECT
 exchange_rates | Authenticated users can insert exchange_rates| INSERT
 exchange_rates | Authenticated users can update exchange_rates| UPDATE
```

---

### 解決問題 2: ExchangeRate-API 403 (次要)

#### 檢查 API 金鑰

```bash
# 查看當前設定
grep EXCHANGE_RATE_API_KEY .env.local

# 應該顯示:
# EXCHANGE_RATE_API_KEY=1679aaaab03fec128b24a69a
```

#### 測試 API 金鑰

```bash
curl "https://v6.exchangerate-api.com/v6/1679aaaab03fec128b24a69a/latest/USD"
```

**如果返回 403**:
1. 前往 https://www.exchangerate-api.com/dashboard
2. 檢查配額使用量
3. 如需要，申請新的免費 API 金鑰
4. 更新 `.env.local`

---

## 🧪 完整測試流程

### 執行資料庫修復後

```bash
# 1. 重啟開發伺服器 (如果需要)
pkill -f "next dev"
npm run dev

# 2. 等待 5 秒

# 3. 測試同步
curl -X POST http://localhost:3000/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency":"USD"}'

# 預期結果:
# {"success": true, "message": "匯率同步成功"}

# 4. 測試獲取
curl http://localhost:3000/api/exchange-rates | jq '.'

# 預期結果:
# {
#   "success": true,
#   "base_currency": "USD",
#   "rates": {
#     "TWD": 30.6022,   ← 真實數字
#     "USD": 1.0,
#     "EUR": 0.8593,    ← 真實數字
#     "JPY": 151.1022,  ← 真實數字
#     "CNY": 7.1281     ← 真實數字
#   }
# }
```

---

## 📁 相關文檔

| 文檔 | 說明 |
|------|------|
| **[ZEABUR_SSH_GUIDE.md](ZEABUR_SSH_GUIDE.md)** | 詳細的 SSH 操作指南 ⭐ |
| [FINAL_STATUS.md](FINAL_STATUS.md) | 完整狀態報告 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架構說明 |
| [FINAL_SETUP_INSTRUCTIONS.md](FINAL_SETUP_INSTRUCTIONS.md) | 設置指引 |

---

## 🎯 優先級

### 🔴 高優先級 (必須完成)

1. ✅ 在 Zeabur PostgreSQL 執行 RLS Migration
2. 🧪 測試 API 功能

### 🟡 中優先級 (如果 API 金鑰有問題)

3. 🔑 檢查/更新 ExchangeRate-API 金鑰

### 🟢 低優先級 (功能正常後)

4. 🎨 UI 整合
5. 📄 PDF 匯出

---

## 💡 重要提醒

### ❌ 錯誤做法

```bash
# 在 bash shell 直接執行 SQL (錯誤!)
root@service:/# CREATE POLICY ...
bash: CREATE: command not found
```

### ✅ 正確做法

```bash
# 先進入 psql
root@service:/# psql postgres

# 在 psql 提示符執行 SQL
postgres=# CREATE POLICY ...
CREATE POLICY
```

---

## 📞 需要協助?

如果遇到問題，請提供：

1. **psql 連接指令輸出**:
   ```bash
   psql postgres 2>&1
   ```

2. **環境變數**:
   ```bash
   env | grep -i postgres
   ```

3. **錯誤訊息**:
   - 完整的錯誤輸出
   - 您執行的指令

---

## ✨ 成功後

一旦資料庫修復完成，您應該會看到：

```
✅ 匯率 API 正常運作
✅ 資料庫可以寫入
✅ 匯率自動同步
✅ 準備進行 UI 整合
```

專案完成度將從 70% → 75%！

---

**下一步**: 執行 [ZEABUR_SSH_GUIDE.md](ZEABUR_SSH_GUIDE.md) 的步驟
