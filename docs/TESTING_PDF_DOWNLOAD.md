# PDF 下載功能測試指南

## 前置條件

1. 確保開發伺服器正在運行：
   ```bash
   npm run dev
   ```

2. 確保已登入系統並有存取報價單的權限

3. 確保資料庫中有至少一筆報價單資料

## 測試步驟

### 測試 1：透過 UI 下載 PDF

1. 前往報價單列表頁面：`http://localhost:3000/zh/quotations`

2. 點擊任一報價單進入詳情頁面

3. 找到「下載 PDF」按鈕並點擊

4. 選擇語言選項：
   - 🇹🇼 中文版 PDF
   - 🇬🇧 英文版 PDF
   - 🌏 雙語版 PDF

5. 確認 PDF 自動下載

6. 開啟下載的 PDF 檔案，檢查：
   - ✅ 繁體中文字元顯示正常
   - ✅ 英文字元顯示正常
   - ✅ 報價單資料正確
   - ✅ 格式排版美觀

### 測試 2：直接 API 測試

如果您知道報價單的 ID（例如：`abc123`），可以直接在瀏覽器中測試：

#### 中文 PDF
```
http://localhost:3000/api/quotations/abc123/pdf?locale=zh&both=false
```

#### 英文 PDF
```
http://localhost:3000/api/quotations/abc123/pdf?locale=en&both=false
```

#### 雙語 PDF
```
http://localhost:3000/api/quotations/abc123/pdf?locale=zh&both=true
```

### 測試 3：使用 curl 測試

```bash
# 取得報價單 ID（假設已登入並取得 session）
QUOTATION_ID="your-quotation-id-here"

# 下載中文 PDF
curl -X GET "http://localhost:3000/api/quotations/${QUOTATION_ID}/pdf?locale=zh&both=false" \
  -H "Cookie: your-session-cookie" \
  -o "test-zh.pdf"

# 下載英文 PDF
curl -X GET "http://localhost:3000/api/quotations/${QUOTATION_ID}/pdf?locale=en&both=false" \
  -H "Cookie: your-session-cookie" \
  -o "test-en.pdf"

# 下載雙語 PDF
curl -X GET "http://localhost:3000/api/quotations/${QUOTATION_ID}/pdf?locale=zh&both=true" \
  -H "Cookie: your-session-cookie" \
  -o "test-bilingual.pdf"
```

## 預期結果

### 成功情況

✅ HTTP 狀態碼：200 OK
✅ Content-Type：application/pdf
✅ Content-Disposition：attachment; filename="quotation-XXX.pdf"
✅ PDF 檔案大小：通常 10-50 KB（取決於內容複雜度）
✅ 可以正常開啟 PDF 並顯示繁體中文

### 失敗情況排查

#### 錯誤 1：401 Unauthorized
**原因**：未登入或 session 過期
**解決**：重新登入系統

#### 錯誤 2：404 Not Found
**原因**：報價單 ID 不存在或無權限存取
**解決**：檢查報價單 ID 是否正確，確認是否有存取權限

#### 錯誤 3：500 Internal Server Error
**原因**：伺服器錯誤
**排查步驟**：
1. 檢查伺服器日誌
2. 確認字體檔案存在：`ls -lh public/fonts/NotoSansTC-Regular.ttf`
3. 確認資料庫連線正常
4. 檢查報價單資料完整性

#### 錯誤 4：PDF 中文顯示為方框 □
**原因**：字體載入失敗
**解決**：
1. 確認字體檔案存在且完整
2. 檢查字體檔案權限
3. 查看 `lib/pdf/QuotationPDFTemplate.tsx` 中的字體註冊程式碼

## 測試檢查清單

- [ ] 中文 PDF 下載成功
- [ ] 英文 PDF 下載成功
- [ ] 雙語 PDF 下載成功
- [ ] 繁體中文字元顯示正常
- [ ] 英文字元顯示正常
- [ ] 數字和貨幣格式正確
- [ ] 日期格式正確
- [ ] 客戶資訊完整
- [ ] 產品項目清單正確
- [ ] 小計、稅額、總計計算正確
- [ ] 頁面排版美觀
- [ ] 檔案名稱格式正確

## 效能測試

執行以下測試以確保效能在可接受範圍內：

```bash
# 測試單個請求的響應時間
time curl -X GET "http://localhost:3000/api/quotations/${QUOTATION_ID}/pdf?locale=zh" \
  -H "Cookie: your-session-cookie" \
  -o "test.pdf"
```

**預期效能**：
- 單個 PDF 生成時間：< 2 秒
- 檔案大小：10-50 KB（取決於項目數量）

## 常見問題

### Q1：為什麼下載速度很慢？
A1：
- 可能原因：字體檔案較大（11.39 MB），首次載入需要時間
- 解決方案：字體會被快取，後續請求會更快

### Q2：如何測試大量報價單的 PDF 生成？
A2：可以使用測試腳本批次生成：
```bash
for id in {1..10}; do
  curl -X GET "http://localhost:3000/api/quotations/${id}/pdf?locale=zh" \
    -H "Cookie: your-session-cookie" \
    -o "test-${id}.pdf"
  sleep 1
done
```

### Q3：如何在生產環境測試？
A3：
1. 確保字體檔案已部署到生產環境
2. 使用 staging 環境先測試
3. 檢查生產環境的日誌輸出
4. 進行小範圍測試後再全面開放

---

**文檔建立日期**: 2025-10-17
**最後更新日期**: 2025-10-17
**維護者**: Claude AI Assistant
