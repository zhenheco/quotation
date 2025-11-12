# Proposal: 修正 RBAC 權限初始化缺失

## 問題描述

登入後所有 API 端點（/api/companies、/api/products、/api/customers、/api/quotations）返回 403 Forbidden 錯誤。

## 根因分析

1. **user_roles 表已正確配置**：用戶已分配 `super_admin` 角色
2. **roles 和 permissions 表已正確初始化**：5 個角色和 22 個權限已存在
3. **role_permissions 表完全為空**：這是問題根源
   - `super_admin` 角色的 `permission_count` 為 0
   - 權限檢查邏輯 (`checkPermission`) 因找不到任何權限而返回 false

## 解決方案

執行 `scripts/insert-default-data.sql` 中的權限映射 SQL：

```sql
-- 為 super_admin 分配所有權限
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'super_admin'),
  id
FROM permissions;
```

## 執行結果

- ✅ 成功插入 22 個權限映射
- ✅ `super_admin` 現在擁有所有 22 個權限
- ✅ KV 快取為空，無需清除

## 影響範圍

- 所有需要權限檢查的 API 端點
- 影響用戶：已分配角色但無法訪問任何資源的用戶

## 預防措施

應確保資料庫遷移時包含完整的預設資料初始化：
1. Roles
2. Permissions
3. Role_Permissions ← **此步驟之前缺失**
4. User_Roles

## 變更類型

Bug Fix - 恢復 RBAC 系統的預期行為
