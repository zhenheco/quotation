# 測試策略文檔

## 目標

為報價單管理系統建立全面的測試策略，確保系統穩定性、可維護性和高品質交付。

---

## 測試金字塔

```
        ╱───────╲
       ╱   E2E   ╲          10% - 關鍵用戶流程
      ╱───────────╲
     ╱ Integration ╲       20% - 模組互動
    ╱───────────────╲
   ╱  Unit Tests     ╲     70% - 函數和方法
  ╱───────────────────╲
```

---

## 1. 單元測試 (Unit Tests)

### 目標
- 測試覆蓋率: **80%+**
- 執行時間: **< 30 秒**
- 每次提交前執行

### 範圍

#### API 路由 (app/api/**)
- 所有 HTTP 端點（GET, POST, PUT, DELETE）
- 認證和授權邏輯
- 輸入驗證
- 錯誤處理
- 速率限制

#### 服務層 (lib/services/**)
- 分析服務（analytics.ts）
- 匯率服務（exchange-rate-zeabur.ts）
- Email 服務（email/service.ts）

#### 中間件 (lib/middleware/**)
- 速率限制器
- 認證中間件
- 錯誤處理中間件

#### 工具函數 (lib/utils/**)
- 格式化函數
- 驗證函數
- 轉換函數

### 實作範例

```typescript
describe('Email API', () => {
  it('應該拒絕無效的 Email 格式', async () => {
    const response = await request(app)
      .post('/api/quotations/123/email')
      .send({ recipientEmail: 'invalid-email' })

    expect(response.status).toBe(400)
    expect(response.body.error).toContain('Valid email required')
  })
})
```

---

## 2. 整合測試 (Integration Tests)

### 目標
- 測試覆蓋率: **關鍵流程 100%**
- 執行時間: **< 2 分鐘**
- 每次 PR 前執行

### 範圍

#### 完整業務流程
1. **報價單生命週期**
   - 創建報價單 → 添加項目 → 發送 Email → 更新狀態 → 生成 PDF

2. **批次操作流程**
   - 選擇多個報價單 → 批次更新狀態 → 批次匯出 PDF

3. **匯率同步流程**
   - 從 API 獲取 → 同步資料庫 → 應用於報價單

4. **分析流程**
   - 查詢報價單 → 計算統計 → 生成圖表數據

### 實作範例

```typescript
describe('報價單完整流程', () => {
  it('應該能創建報價單並發送 Email', async () => {
    // 1. 創建客戶
    const customer = await createCustomer({ ... })

    // 2. 創建產品
    const product = await createProduct({ ... })

    // 3. 創建報價單
    const quotation = await createQuotation({
      customerId: customer.id,
      items: [{ productId: product.id, quantity: 2 }]
    })

    // 4. 發送 Email
    const emailResult = await sendEmail(quotation.id)

    // 5. 驗證結果
    expect(quotation.status).toBe('sent')
    expect(emailResult.success).toBe(true)
  })
})
```

---

## 3. E2E 測試 (End-to-End Tests)

### 目標
- 覆蓋: **5-10 個關鍵用戶流程**
- 執行時間: **< 5 分鐘**
- 每次發布前執行

### 關鍵流程

1. **用戶認證流程**
   - Google OAuth 登入
   - 登出
   - 權限驗證

2. **報價單管理**
   - 創建新報價單
   - 編輯報價單
   - 刪除報價單
   - 查看報價單列表

3. **Email 發送**
   - 選擇報價單
   - 填寫收件人
   - 添加 CC
   - 發送並確認

4. **批次操作**
   - 選擇多個報價單
   - 批次更新狀態
   - 批次匯出 PDF

5. **儀表板查看**
   - 查看營收趨勢圖
   - 查看貨幣分布圖
   - 查看狀態統計

### 實作範例（Playwright）

```typescript
test('用戶可以創建報價單並發送 Email', async ({ page }) => {
  // 登入
  await page.goto('/login')
  await page.click('text=Login with Google')

  // 創建報價單
  await page.goto('/quotations/new')
  await page.selectOption('select[name="customer"]', 'customer-1')
  await page.click('text=Add Item')
  await page.fill('input[name="quantity"]', '2')
  await page.click('text=Save')

  // 發送 Email
  await page.click('text=Send Email')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.click('text=Send')

  // 驗證成功
  await expect(page.locator('text=Email sent successfully')).toBeVisible()
})
```

---

## 4. 性能測試 (Performance Tests)

### 目標
- API 響應時間: **< 200ms (P95)**
- 並發支援: **100+ 並發用戶**
- 資料庫查詢: **< 50ms**

### 測試場景

#### 1. API 端點響應時間
```javascript
// 使用 Artillery
config:
  target: 'https://api.example.com'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: 'Get Quotations'
    flow:
      - get:
          url: '/api/quotations'
      - think: 1
```

#### 2. 資料庫查詢性能
```typescript
describe('資料庫性能', () => {
  it('查詢 1000 筆報價單應該 < 100ms', async () => {
    const start = Date.now()
    await getQuotations({ limit: 1000 })
    const duration = Date.now() - start

    expect(duration).toBeLessThan(100)
  })
})
```

#### 3. 批次操作性能
```typescript
it('批次匯出 20 個 PDF 應該 < 5 秒', async () => {
  const start = Date.now()
  await exportBatchPDF(quotationIds)
  const duration = Date.now() - start

  expect(duration).toBeLessThan(5000)
})
```

---

## 5. 安全測試 (Security Tests)

### 目標
- **零高危漏洞**
- **零中危漏洞**
- 定期掃描

### 測試項目

#### 1. 認證和授權
- 未認證請求被拒絕
- 跨用戶資料訪問被阻止
- RLS 政策有效

#### 2. 輸入驗證
- SQL Injection 防護
- XSS 防護
- CSRF 防護
- Email Header Injection 防護

#### 3. 敏感資料保護
- API KEY 不在日誌中顯示
- 密碼不在錯誤訊息中顯示
- 環境變數不硬編碼

#### 4. 速率限制
- 所有敏感端點有速率限制
- DDoS 攻擊防護

### 實作範例

```typescript
describe('安全測試', () => {
  it('應該防止 SQL Injection', async () => {
    const response = await request(app)
      .get('/api/quotations')
      .query({ id: "1' OR '1'='1" })

    expect(response.status).toBe(400)
  })

  it('應該防止跨用戶資料訪問', async () => {
    const user1Token = await getToken(user1)
    const user2Quotation = await createQuotation(user2)

    const response = await request(app)
      .get(`/api/quotations/${user2Quotation.id}`)
      .auth(user1Token, { type: 'bearer' })

    expect(response.status).toBe(403)
  })
})
```

---

## 6. 回歸測試 (Regression Tests)

### 目標
- **防止已修復的 Bug 再次出現**
- 每個 Bug 修復後增加測試

### 流程
1. 發現 Bug
2. 撰寫失敗的測試（重現 Bug）
3. 修復 Bug
4. 測試通過
5. 測試加入回歸測試套件

---

## 測試環境

### 本地開發環境
- 使用 SQLite 或本地 PostgreSQL
- Mock 外部 API（ExchangeRate-API, Resend）
- 快速回饋循環

### CI/CD 環境
- 使用 Docker 容器
- 完整的資料庫設置
- 模擬生產環境

### Staging 環境
- 與生產環境相同配置
- 真實的外部 API（測試 KEY）
- E2E 測試執行環境

---

## 測試數據管理

### Fixtures
```typescript
// tests/fixtures/quotations.ts
export const mockQuotation = {
  id: 'test-quotation-1',
  quotation_number: 'QT-2025-001',
  customer_id: 'test-customer-1',
  status: 'draft',
  total_amount: 10000,
  currency: 'TWD',
}

export const mockQuotations = [
  mockQuotation,
  { ...mockQuotation, id: 'test-quotation-2' },
  { ...mockQuotation, id: 'test-quotation-3' },
]
```

### Factory Pattern
```typescript
// tests/factories/quotation-factory.ts
export class QuotationFactory {
  static create(overrides = {}) {
    return {
      id: faker.uuid(),
      quotation_number: faker.random.alphaNumeric(10),
      total_amount: faker.random.number({ min: 1000, max: 100000 }),
      ...overrides,
    }
  }
}
```

---

## CI/CD 整合

### GitHub Actions 範例

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit

      - name: Run coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Run integration tests
        run: npm run test:integration

      - name: Run E2E tests
        run: npm run test:e2e
```

---

## 監控和報告

### 覆蓋率報告
- 使用 Codecov 或 Coveralls
- 每次 PR 顯示覆蓋率變化
- 設定最低覆蓋率門檻（80%）

### 測試結果報告
- 使用 Vitest UI 查看詳細結果
- 生成 HTML 報告
- 失敗測試自動通知

### 性能報告
- 使用 Lighthouse CI
- 追蹤 API 響應時間趨勢
- 設定性能預算

---

## 最佳實踐

### 1. AAA 模式
- **Arrange**: 準備測試數據
- **Act**: 執行被測試的功能
- **Assert**: 驗證結果

### 2. 測試隔離
- 每個測試獨立
- 不依賴執行順序
- 清理測試數據

### 3. 有意義的測試名稱
```typescript
// ✓ 好
it('應該在收件人 Email 無效時返回 400 錯誤', ...)

// ✗ 差
it('test email validation', ...)
```

### 4. 避免測試實作細節
```typescript
// ✓ 好 - 測試行為
expect(response.status).toBe(200)
expect(response.body.data).toHaveLength(3)

// ✗ 差 - 測試實作
expect(mockDatabase.query).toHaveBeenCalledWith('SELECT * FROM ...')
```

### 5. 使用 Factory 而非 Fixtures
- Factory 更靈活
- 可以隨機生成數據
- 避免測試間的數據耦合

---

## 維護和更新

### 定期檢查
- 每月檢視測試覆蓋率
- 移除過時的測試
- 更新測試數據

### 測試債務管理
- 記錄需要補充的測試
- 優先處理高風險區域
- 在 Sprint 中分配時間

### 團隊培訓
- 新成員測試培訓
- 分享測試最佳實踐
- 定期測試 Code Review

---

## 總結

這套測試策略提供了全面的測試覆蓋，從單元測試到 E2E 測試，從功能測試到性能和安全測試。遵循這套策略可以確保系統的高品質和穩定性。

**關鍵指標**:
- 單元測試覆蓋率: 80%+
- 整合測試: 關鍵流程 100%
- E2E 測試: 5-10 個關鍵流程
- API 響應時間: < 200ms (P95)
- 零高危安全漏洞
