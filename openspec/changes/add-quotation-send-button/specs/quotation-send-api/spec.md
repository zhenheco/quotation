# Spec: quotation-send-api

## Overview
報價單寄送 API 規格，包含單一報價單寄送和批次報價單寄送端點，以及郵件服務整合。

---

## ADDED Requirements

### Requirement: 單一報價單寄送 API 端點
**Priority**: High
**Status**: Proposed

系統 SHALL 提供 `POST /api/quotations/[id]/send` 端點，用於寄送單一報價單到客戶電子郵件。

#### Scenario: 成功寄送單一報價單
**Given**: 使用者已認證且報價單存在
**When**: 發送 POST 請求到 `/api/quotations/[id]/send` 並包含郵件主旨和內容
**Then**:
- API 驗證報價單存在且屬於該使用者
- 檢查客戶是否有有效的電子郵件地址
- 使用郵件服務發送報價單
- 更新報價單狀態為 'sent'
- 回傳 200 狀態碼和成功訊息
- 回傳更新後的報價單資料

**Request Body**:
```json
{
  "subject": "報價單 #Q-2025-001",
  "content": "親愛的客戶，\n\n這是您的報價單...",
  "locale": "zh"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Quotation sent successfully",
  "data": {
    "id": "...",
    "quotation_number": "Q-2025-001",
    "status": "sent",
    "sent_at": "2025-01-10T10:30:00Z",
    "customer_email": "customer@example.com"
  }
}
```

#### Scenario: 客戶沒有電子郵件地址
**Given**: 報價單的客戶資料中沒有 email 欄位或為空
**When**: 發送 POST 請求到 `/api/quotations/[id]/send`
**Then**:
- API 回傳 400 狀態碼
- 錯誤訊息：「Customer does not have an email address」

**Response (400)**:
```json
{
  "success": false,
  "error": "Customer does not have an email address",
  "code": "MISSING_CUSTOMER_EMAIL"
}
```

#### Scenario: 報價單不存在或無權限
**Given**: 報價單 ID 不存在或不屬於該使用者
**When**: 發送 POST 請求到 `/api/quotations/[id]/send`
**Then**:
- API 回傳 404 狀態碼
- 錯誤訊息：「Quotation not found」

**Response (404)**:
```json
{
  "success": false,
  "error": "Quotation not found",
  "code": "QUOTATION_NOT_FOUND"
}
```

#### Scenario: 郵件服務發送失敗
**Given**: Gmail API 或郵件服務回傳錯誤
**When**: 嘗試發送郵件
**Then**:
- API 回傳 500 狀態碼
- 錯誤訊息包含失敗原因
- 報價單狀態不變更

**Response (500)**:
```json
{
  "success": false,
  "error": "Failed to send email: [詳細錯誤訊息]",
  "code": "EMAIL_SEND_FAILED"
}
```

---

### Requirement: 批次報價單寄送 API 端點
**Priority**: High
**Status**: Proposed

系統 SHALL 提供 `POST /api/quotations/batch/send` 端點，用於一次寄送多個報價單。

#### Scenario: 成功批次寄送報價單
**Given**: 使用者已認證且所有報價單都存在
**When**: 發送 POST 請求到 `/api/quotations/batch/send` 並包含報價單 ID 列表
**Then**:
- API 驗證所有報價單存在且屬於該使用者
- 過濾掉沒有客戶電子郵件的報價單
- 批次發送郵件
- 更新成功寄送的報價單狀態為 'sent'
- 回傳成功和失敗的統計資訊

**Request Body**:
```json
{
  "ids": ["id1", "id2", "id3"],
  "subject": "報價單通知",
  "content": "親愛的客戶，...",
  "locale": "zh"
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Batch send completed",
  "data": {
    "total": 3,
    "sent": 2,
    "failed": 1,
    "results": [
      {
        "id": "id1",
        "quotation_number": "Q-2025-001",
        "status": "success",
        "sent_at": "2025-01-10T10:30:00Z"
      },
      {
        "id": "id2",
        "quotation_number": "Q-2025-002",
        "status": "success",
        "sent_at": "2025-01-10T10:30:01Z"
      },
      {
        "id": "id3",
        "quotation_number": "Q-2025-003",
        "status": "failed",
        "error": "Customer does not have an email address"
      }
    ]
  }
}
```

#### Scenario: 批次數量限制
**Given**: 使用者嘗試一次寄送超過 50 個報價單
**When**: 發送 POST 請求到 `/api/quotations/batch/send`
**Then**:
- API 回傳 400 狀態碼
- 錯誤訊息：「Batch size exceeds maximum limit of 50」

**Response (400)**:
```json
{
  "success": false,
  "error": "Batch size exceeds maximum limit of 50",
  "code": "BATCH_SIZE_EXCEEDED"
}
```

---

### Requirement: 郵件內容生成
**Priority**: High
**Status**: Proposed

系統 MUST 根據報價單資料和使用者輸入，生成郵件內容。

#### Scenario: 使用預設郵件範本
**Given**: 使用者沒有自訂郵件內容
**When**: API 準備發送郵件
**Then**:
- 使用系統預設範本
- 範本包含以下變數：
  - 客戶名稱
  - 報價單編號
  - 發單日期
  - 有效期限
  - 總金額
  - 查看報價單連結
  - 下載 PDF 連結
- 根據 locale 參數使用對應語言

**預設範本（中文）**:
```
親愛的 {customer_name}，

感謝您的詢價。以下是您的報價單詳情：

報價單編號：{quotation_number}
發單日期：{issue_date}
有效期限：{valid_until}
總金額：{currency} {total}

您可以點擊以下連結查看完整報價單：
{view_url}

或直接下載 PDF 版本：
{download_url}

如有任何問題，歡迎隨時與我們聯繫。

祝商祺，
{company_name}
```

#### Scenario: 使用者自訂郵件內容
**Given**: 使用者在寄送確認彈窗中編輯了郵件內容
**When**: API 接收到自訂內容
**Then**:
- 使用使用者提供的郵件主旨和內容
- 不套用預設範本
- 仍包含必要的報價單資訊（作為附加資訊）

---

### Requirement: 郵件服務整合
**Priority**: High
**Status**: Proposed

系統 SHALL 整合 Gmail API 或其他郵件服務，確保郵件能成功發送。

#### Scenario: 使用 Gmail API 發送郵件
**Given**: 環境變數 `GMAIL_USER` 和 `GMAIL_APP_PASSWORD` 已設定
**When**: API 需要發送郵件
**Then**:
- 使用 Gmail SMTP 服務
- 設定正確的認證資訊
- 郵件 From 欄位使用 `GMAIL_USER`
- 郵件 To 欄位使用客戶 email
- 包含 HTML 格式內容
- 記錄發送日誌

#### Scenario: Gmail API 認證失敗
**Given**: Gmail 認證資訊錯誤或過期
**When**: 嘗試發送郵件
**Then**:
- 記錄詳細錯誤日誌
- 回傳明確的錯誤訊息
- 不更新報價單狀態

---

### Requirement: 報價單狀態更新
**Priority**: High
**Status**: Proposed

系統 SHALL 在寄送成功後自動更新報價單狀態。

#### Scenario: 首次寄送報價單
**Given**: 報價單狀態為 'draft'
**When**: 郵件成功發送
**Then**:
- 更新報價單狀態為 'sent'
- 記錄 `sent_at` 時間戳（如果資料表有此欄位）
- 觸發 React Query 快取更新

#### Scenario: 重新寄送報價單
**Given**: 報價單狀態已經是 'sent'
**When**: 再次發送郵件成功
**Then**:
- 狀態保持為 'sent'
- 更新 `sent_at` 時間戳為最新發送時間
- 記錄重複發送次數（未來改進）

---

## MODIFIED Requirements

無

---

## REMOVED Requirements

無
