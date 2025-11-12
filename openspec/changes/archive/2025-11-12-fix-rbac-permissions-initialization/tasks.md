# Tasks: 修正 RBAC 權限初始化

## 已完成

- [x] 診斷 403 錯誤根因
  - [x] 檢查 user_roles 表：✅ 用戶已有 super_admin 角色
  - [x] 檢查 roles 表：✅ 5 個角色存在
  - [x] 檢查 permissions 表：✅ 22 個權限存在
  - [x] 檢查 role_permissions 表：❌ 完全為空（根因）

- [x] 執行權限映射 SQL
  ```bash
  pnpm exec wrangler d1 execute quotation-system-db --remote \
    --command="INSERT INTO role_permissions (role_id, permission_id)
               SELECT (SELECT id FROM roles WHERE name = 'super_admin'), id
               FROM permissions"
  ```
  - 結果：22 個權限成功映射

- [x] 驗證修正
  - [x] 確認 super_admin 現在擁有 22 個權限
  - [x] 檢查 KV 快取狀態：空的，無需清除

## 待辦

- [ ] 測試所有 API 端點
  - [ ] GET /api/companies - 應返回 200
  - [ ] GET /api/products - 應返回 200
  - [ ] GET /api/customers - 應返回 200
  - [ ] GET /api/quotations - 應返回 200

- [ ] 更新資料庫遷移腳本
  - [ ] 確保 role_permissions 初始化包含在遷移流程中
  - [ ] 將 `scripts/insert-default-data.sql` 整合到主要遷移流程

- [ ] 文檔更新
  - [ ] 記錄此問題到 ISSUELOG.md
  - [ ] 更新部署檢查清單，加入「驗證 role_permissions 表」項目
