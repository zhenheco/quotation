# exchange-rates-permission Specification

## Purpose
TBD - created by archiving change fix-dashboard-errors. Update Purpose after archive.
## Requirements
### Requirement: 權限映射支援匯率 API

系統 MUST 在權限映射表中包含 `exchange_rates:read` 權限，以確保匯率 API 可以正常存取。

#### Scenario: 使用者存取匯率 API

**Given** 使用者已登入並具有讀取匯率的權限
**When** 使用者請求 `/api/exchange-rates?base=TWD`
**Then** API 應回傳 200 狀態碼
**And** 回傳的資料包含匯率資訊

#### Scenario: 權限映射正確配置

**Given** `lib/cache/services.ts` 的 `permissionMapping` 物件
**When** 檢查 `exchange_rates:read` 權限映射
**Then** 該權限應映射到資料庫中的對應權限
**Or** 該權限應可直接匹配使用者的權限列表

