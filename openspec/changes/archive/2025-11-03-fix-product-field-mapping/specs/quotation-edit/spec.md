# 報價單編輯功能規格 - 產品選擇修復

## MODIFIED Requirements

### Requirement: 產品選擇時自動填入產品資料
報價單編輯表單在用戶從下拉選單選擇產品後，系統 SHALL 自動將產品的單價（unit_price）、幣別（currency）等相關資料正確填入對應的表單欄位。

#### Scenario: 選擇產品後自動填入單價
- **GIVEN** 用戶在報價單編輯頁面
- **AND** 產品清單中有可用產品
- **WHEN** 用戶從產品下拉選單選擇一個產品
- **THEN** 產品的單價應正確顯示在「單價」欄位
- **AND** 產品的幣別應正確顯示（若與報價單幣別不同，應自動換算）
- **AND** 數量預設為 1
- **AND** 折扣預設為 0
- **AND** 小計應自動計算為：(數量 × 單價) + 折扣

#### Scenario: 選擇產品時處理幣別轉換
- **GIVEN** 報價單使用 TWD 幣別
- **AND** 產品使用 USD 幣別，單價為 100 USD
- **WHEN** 用戶選擇該產品
- **THEN** 系統應使用匯率 API 將 100 USD 轉換為對應的 TWD 金額
- **AND** 轉換後的金額應顯示在「單價」欄位

#### Scenario: API 返回正確的欄位名稱
- **GIVEN** 產品 API 端點（GET /api/products, GET /api/products/[id]）
- **WHEN** 前端呼叫 API 取得產品資料
- **THEN** API 回應應包含 `unit_price` 欄位（映射自資料庫的 `base_price`）
- **AND** API 回應應包含 `currency` 欄位（映射自資料庫的 `base_currency`）
- **AND** 為了向後相容，API 也應保留 `base_price` 和 `base_currency` 欄位

## ADDED Requirements

### Requirement: 產品 API 欄位映射
產品 API SHALL 在回應中提供前端期望的欄位名稱，同時保留資料庫原始欄位以確保向後相容。

#### Scenario: GET /api/products 欄位映射
- **WHEN** 呼叫 GET /api/products 端點
- **THEN** 每個產品物件應包含：
  - `base_price`: 資料庫原始欄位
  - `base_currency`: 資料庫原始欄位
  - `unit_price`: 映射自 `base_price`
  - `currency`: 映射自 `base_currency`

#### Scenario: GET /api/products/[id] 欄位映射
- **WHEN** 呼叫 GET /api/products/[id] 端點
- **THEN** 產品物件應包含：
  - `base_price`: 資料庫原始欄位
  - `base_currency`: 資料庫原始欄位
  - `unit_price`: 映射自 `base_price`
  - `currency`: 映射自 `base_currency`

#### Scenario: PUT /api/products/[id] 回應欄位映射
- **WHEN** 呼叫 PUT /api/products/[id] 更新產品
- **THEN** 更新成功後的回應物件應包含映射後的欄位
- **AND** 確保前端可以立即使用更新後的資料
