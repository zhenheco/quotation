# 測試快速開始指南

快速開始使用報價單管理系統的測試套件。

---

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 執行所有測試

```bash
npm run test
```

### 3. 查看測試報告

```bash
npm run test:ui
```

在瀏覽器中打開 `http://localhost:51204/__vitest__/`

---

## 常用命令

| 命令 | 說明 |
|------|------|
| `npm run test` | 啟動測試（監聽模式） |
| `npm run test:run` | 執行一次測試 |
| `npm run test:ui` | 開啟測試 UI 介面 |
| `npm run test:coverage` | 生成測試覆蓋率報告 |
| `npm run test:unit` | 只執行單元測試 |
| `npm run test:integration` | 只執行整合測試 |
| `npm run test:e2e` | 只執行 E2E 測試 |
| `npm run test:watch` | 監聽模式 |

---

## 執行特定測試

### 執行單一測試文件

```bash
npx vitest run tests/unit/email-api.test.ts
```

### 執行特定測試案例

```bash
npx vitest run -t "應該拒絕無效的 Email"
```

### 監聽模式執行特定文件

```bash
npx vitest tests/unit/email-api.test.ts
```

---

## 查看測試覆蓋率

### 生成覆蓋率報告

```bash
npm run test:coverage
```

### 查看 HTML 報告

```bash
open coverage/index.html
```

---

## 撰寫新測試

### 1. 創建測試文件

在 `tests/unit/` 目錄下創建測試文件：

```typescript
// tests/unit/my-feature.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('我的功能', () => {
  beforeEach(() => {
    // 每個測試前的設置
    vi.clearAllMocks()
  })

  it('應該正確處理輸入', () => {
    // Arrange - 準備測試數據
    const input = 'test'

    // Act - 執行被測試的功能
    const result = myFunction(input)

    // Assert - 驗證結果
    expect(result).toBe('expected output')
  })
})
```

### 2. 使用 Mock

```typescript
import { vi } from 'vitest'

// Mock 模組
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock 函數
const mockFunction = vi.fn()
mockFunction.mockReturnValue('mock value')
mockFunction.mockResolvedValue('async mock value')
```

### 3. 測試 API 端點

```typescript
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/my-endpoint/route'

it('應該返回 200', async () => {
  const request = new NextRequest('http://localhost:3000/api/my-endpoint', {
    method: 'POST',
    body: JSON.stringify({ data: 'test' }),
  })

  const response = await POST(request)
  const data = await response.json()

  expect(response.status).toBe(200)
  expect(data.success).toBe(true)
})
```

---

## 常見問題

### Q: 測試執行很慢怎麼辦？

**A**: 使用監聽模式只執行變更的測試：

```bash
npm run test:watch
```

### Q: 如何跳過某個測試？

**A**: 使用 `it.skip`：

```typescript
it.skip('這個測試暫時跳過', () => {
  // ...
})
```

### Q: 如何只執行某個測試？

**A**: 使用 `it.only`：

```typescript
it.only('只執行這個測試', () => {
  // ...
})
```

### Q: Mock 不生效怎麼辦？

**A**: 確保 Mock 在 import 之前定義：

```typescript
// ✓ 正確
vi.mock('@/lib/module')
import { myFunction } from '@/lib/module'

// ✗ 錯誤
import { myFunction } from '@/lib/module'
vi.mock('@/lib/module')
```

### Q: 測試環境變數怎麼設置？

**A**: 在 `tests/setup.ts` 中設置：

```typescript
process.env.API_KEY = 'test-key'
```

---

## 測試範例

### 範例 1: 測試 API 端點

```typescript
describe('Email API', () => {
  it('應該成功發送 Email', async () => {
    // Mock 認證
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    // Mock 資料庫查詢
    mockSupabaseClient.from().single.mockResolvedValue({
      data: mockQuotation,
      error: null,
    })

    // Mock Email 服務
    vi.mocked(sendQuotationEmail).mockResolvedValue({
      success: true,
    })

    // 發送請求
    const request = new NextRequest('http://localhost:3000/api/email', {
      method: 'POST',
      body: JSON.stringify({
        recipientEmail: 'test@example.com',
      }),
    })

    const response = await POST(request, { params: { id: 'test-id' } })
    const data = await response.json()

    // 驗證結果
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(sendQuotationEmail).toHaveBeenCalled()
  })
})
```

### 範例 2: 測試服務層函數

```typescript
describe('分析服務', () => {
  it('應該返回營收趨勢數據', async () => {
    // Mock 認證
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    // Mock 資料庫查詢
    mockSupabaseClient.from().order.mockResolvedValue({
      data: mockQuotations,
      error: null,
    })

    // 執行函數
    const result = await getRevenueTrend(6)

    // 驗證結果
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('month')
    expect(result[0]).toHaveProperty('revenue')
  })
})
```

### 範例 3: 測試錯誤處理

```typescript
describe('錯誤處理', () => {
  it('應該處理資料庫錯誤', async () => {
    // Mock 資料庫錯誤
    mockSupabaseClient.from().single.mockResolvedValue({
      data: null,
      error: new Error('Database error'),
    })

    const request = new NextRequest('http://localhost:3000/api/test')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })
})
```

---

## 除錯技巧

### 1. 使用 console.log

```typescript
it('除錯測試', () => {
  const result = myFunction()
  console.log('Result:', result)
  expect(result).toBe('expected')
})
```

### 2. 使用 debug 模式

```bash
NODE_OPTIONS='--inspect-brk' npm run test:run
```

然後在 Chrome 中打開 `chrome://inspect`

### 3. 查看 Mock 調用

```typescript
console.log(mockFunction.mock.calls)
console.log(mockFunction.mock.results)
```

### 4. 使用 test.only 隔離問題

```typescript
it.only('隔離這個測試', () => {
  // 只執行這個測試
})
```

---

## CI/CD 整合

### GitHub Actions

測試會在以下情況自動執行：

- 每次 `git push`
- 每次 Pull Request
- 每天定時執行

### 本地模擬 CI

```bash
# 執行與 CI 相同的測試
./scripts/tests/run-all-tests.sh
```

---

## 獲取幫助

### 資源

- [Vitest 官方文檔](https://vitest.dev/)
- [Testing Library 文檔](https://testing-library.com/)
- [測試策略文檔](./TESTING_STRATEGY.md)
- [完整測試報告](./TEST_REPORT.md)

### 常見錯誤排查

| 錯誤訊息 | 可能原因 | 解決方案 |
|---------|---------|---------|
| `Cannot find module` | 模組路徑錯誤 | 檢查 import 路徑 |
| `Mock not working` | Mock 順序錯誤 | Mock 要在 import 之前 |
| `Timeout` | 測試執行太久 | 增加 timeout 或優化測試 |
| `Memory leak` | 沒有清理 Mock | 使用 `vi.clearAllMocks()` |

---

## 下一步

1. 查看 [完整測試報告](./TEST_REPORT.md) 了解測試結果
2. 閱讀 [測試策略文檔](./TESTING_STRATEGY.md) 了解測試方法
3. 開始撰寫你的第一個測試！

---

**提示**: 測試是確保代碼品質的最佳方式，不要跳過測試！
