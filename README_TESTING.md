# 報價單管理系統 - 測試文檔總覽

本項目包含完整的測試套件，涵蓋單元測試、整合測試和 E2E 測試。

---

## 快速開始

```bash
# 安裝依賴
npm install

# 執行所有測試
npm run test:run

# 查看測試覆蓋率
npm run test:coverage

# 使用 UI 介面
npm run test:ui
```

---

## 測試統計

| 階段 | 測試數 | 狀態 |
|------|--------|------|
| Phase 1 - Email 發送 | 25 | ✓ 已實作 |
| Phase 2 - 圖表分析 | 20 | ✓ 已實作 |
| Phase 3 - 批次操作 | 30 | ✓ 已實作 |
| Phase 4 - 匯率更新 | 35 | ✓ 已實作 |
| 速率限制器 | 17 | ✓ 已實作 |
| **總計** | **127** | **已實作** |

---

## 文檔

- [測試快速開始指南](./docs/TESTING_QUICKSTART.md) - 5 分鐘快速上手
- [完整測試報告](./docs/TEST_REPORT.md) - 詳細測試結果和分析
- [測試策略文檔](./docs/TESTING_STRATEGY.md) - 測試方法和最佳實踐

---

## 測試命令

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

## 測試覆蓋的功能

### Phase 1: Email 發送
- ✓ Email 格式驗證
- ✓ CC 副本功能（最多 10 個）
- ✓ 雙語 Email 模板
- ✓ 速率限制（20 封/小時）

### Phase 2: 圖表和分析
- ✓ 6 個月營收趨勢
- ✓ 貨幣分布圓餅圖
- ✓ 狀態統計長條圖
- ✓ 儀表板摘要
- ✓ N+1 查詢性能測試

### Phase 3: 批次操作
- ✓ 批次刪除
- ✓ 批次狀態更新
- ✓ 批次 PDF 匯出
- ✓ 速率限制（5 次/5 分鐘）

### Phase 4: 匯率自動更新
- ✓ 每日自動同步（Cron Job）
- ✓ 手動同步 API
- ✓ 5 種貨幣支援
- ✓ 錯誤通知（Webhook）
- ✓ 重試機制
- ✓ 速率限制（10 次/小時）

---

## 安全性測試

- ✓ 環境變數驗證（無硬編碼）
- ✓ Email 格式驗證
- ✓ API 速率限制
- ✓ RLS 資料隔離
- ✓ 用戶權限驗證

---

## 性能測試

- ✓ N+1 查詢檢測
- ✓ API 響應時間測試
- ✓ 並發請求測試
- ✓ 記憶體洩漏檢測

---

## 測試工具

- **Vitest**: 測試框架
- **Testing Library**: React 組件測試
- **MSW**: API Mock
- **Supertest**: HTTP 端點測試
- **jsdom**: DOM 環境模擬

---

## 貢獻測試

### 撰寫新測試

1. 在 `tests/unit/` 目錄下創建測試文件
2. 使用 AAA 模式（Arrange-Act-Assert）
3. 確保測試隔離（不依賴其他測試）
4. 使用有意義的測試名稱

### 測試範例

```typescript
describe('我的功能', () => {
  it('應該正確處理輸入', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = myFunction(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

---

## CI/CD

測試會在以下情況自動執行：

- 每次 `git push`
- 每次 Pull Request
- 每天定時執行

---

## 問題回報

如果測試失敗或發現問題，請：

1. 查看 [完整測試報告](./docs/TEST_REPORT.md)
2. 檢查測試日誌
3. 提交 Issue 並附上錯誤訊息

---

## 下一步

1. 閱讀 [測試快速開始指南](./docs/TESTING_QUICKSTART.md)
2. 查看 [完整測試報告](./docs/TEST_REPORT.md)
3. 參考 [測試策略文檔](./docs/TESTING_STRATEGY.md)

---

**測試覆蓋率目標**: 80%+

**最後更新**: 2025-10-16
