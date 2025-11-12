#!/bin/bash
# ============================================================================
# 初始化 RBAC 角色權限映射
# 用途：確保所有角色都有正確的權限配置
# ============================================================================

set -e

echo "🔧 開始初始化 RBAC 角色權限..."

# 檢查環境變數
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ 錯誤：CLOUDFLARE_API_TOKEN 環境變數未設定"
  echo "請執行：export CLOUDFLARE_API_TOKEN=your_token"
  exit 1
fi

# 1. 檢查 role_permissions 表狀態
echo "📊 檢查 role_permissions 表..."
CURRENT_COUNT=$(pnpm exec wrangler d1 execute quotation-system-db --remote \
  --command="SELECT COUNT(*) as count FROM role_permissions" \
  --json | jq -r '.[0].results[0].count')

echo "   當前記錄數：$CURRENT_COUNT"

if [ "$CURRENT_COUNT" -gt "0" ]; then
  echo "⚠️  role_permissions 表已有資料"
  read -p "是否清除並重新初始化？(y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  清除現有資料..."
    pnpm exec wrangler d1 execute quotation-system-db --remote \
      --command="DELETE FROM role_permissions"
  else
    echo "✅ 保留現有資料，退出"
    exit 0
  fi
fi

# 2. 為 super_admin 分配所有權限
echo "👑 為 super_admin 分配所有權限..."
pnpm exec wrangler d1 execute quotation-system-db --remote \
  --command="INSERT INTO role_permissions (role_id, permission_id)
             SELECT (SELECT id FROM roles WHERE name = 'super_admin'), id
             FROM permissions"

# 3. 為 company_owner 分配所有權限
echo "🏢 為 company_owner 分配所有權限..."
pnpm exec wrangler d1 execute quotation-system-db --remote \
  --command="INSERT INTO role_permissions (role_id, permission_id)
             SELECT (SELECT id FROM roles WHERE name = 'company_owner'), id
             FROM permissions"

# 4. 為 sales_manager 分配業務相關權限
echo "👔 為 sales_manager 分配業務權限..."
pnpm exec wrangler d1 execute quotation-system-db --remote \
  --command="INSERT INTO role_permissions (role_id, permission_id)
             SELECT (SELECT id FROM roles WHERE name = 'sales_manager'), id
             FROM permissions
             WHERE category IN ('customer_management', 'product_management', 'quotation_management', 'financial_management')
                OR name IN ('view_reports')"

# 5. 為 salesperson 分配基本權限
echo "💼 為 salesperson 分配基本權限..."
pnpm exec wrangler d1 execute quotation-system-db --remote \
  --command="INSERT INTO role_permissions (role_id, permission_id)
             SELECT (SELECT id FROM roles WHERE name = 'salesperson'), id
             FROM permissions
             WHERE name IN (
               'view_customers', 'create_customers', 'edit_customers',
               'view_products',
               'view_quotations', 'create_quotations', 'edit_quotations',
               'view_payments'
             )"

# 6. 為 accountant 分配財務權限
echo "💰 為 accountant 分配財務權限..."
pnpm exec wrangler d1 execute quotation-system-db --remote \
  --command="INSERT INTO role_permissions (role_id, permission_id)
             SELECT (SELECT id FROM roles WHERE name = 'accountant'), id
             FROM permissions
             WHERE category = 'financial_management'
                OR name IN ('view_customers', 'view_products', 'view_quotations', 'view_reports')"

# 7. 驗證結果
echo ""
echo "📊 驗證權限分配結果..."
pnpm exec wrangler d1 execute quotation-system-db --remote \
  --command="SELECT r.name as role_name, r.name_zh, COUNT(p.id) as permission_count
             FROM roles r
             LEFT JOIN role_permissions rp ON r.id = rp.role_id
             LEFT JOIN permissions p ON rp.permission_id = p.id
             GROUP BY r.name, r.name_zh
             ORDER BY r.level"

echo ""
echo "✅ RBAC 角色權限初始化完成！"
