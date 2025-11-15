# Spec: Exchange Rates Permission Mapping

## ADDED Requirements

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

## Implementation Notes

### 修改位置
檔案：`lib/cache/services.ts`

在 `permissionMapping` 物件中新增：
```typescript
const permissionMapping: Record<string, string[]> = {
  'companies:read': ['company_settings:read'],
  'companies:write': ['company_settings:write'],
  'exchange_rates:read': ['exchange_rates:read'], // 新增這行
}
```

### 替代方案
如果不使用映射表，可以直接在 `checkPermission` 函式中允許 `exchange_rates:read` 權限通過。

### 測試驗證
```bash
# 測試 API 回應
curl -H "Authorization: Bearer <valid-token>" \
  http://localhost:3000/api/exchange-rates?base=TWD

# 預期結果：200 OK
# 預期內容：{ "success": true, "base_currency": "TWD", "rates": {...} }
```

## Related Files
- `app/api/exchange-rates/route.ts` - API 路由實作
- `lib/cache/services.ts` - 權限檢查邏輯
- `lib/dal/rbac.ts` - RBAC 資料存取層

## Acceptance Criteria
- [ ] `permissionMapping` 包含 `exchange_rates:read` 映射
- [ ] API `/api/exchange-rates` 回傳 200 而非 403
- [ ] 不影響現有權限檢查邏輯
- [ ] 通過 TypeScript 編譯
