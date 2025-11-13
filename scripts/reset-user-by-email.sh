#!/bin/bash

# 根據 email 清空用戶資料
# 使用方式：./scripts/reset-user-by-email.sh acejou27@gmail.com

EMAIL="$1"

if [ -z "$EMAIL" ]; then
  echo "錯誤：請提供 email"
  echo "使用方式：$0 <email>"
  exit 1
fi

echo "🔍 查詢用戶 ID..."
echo "Email: $EMAIL"
echo ""

# 步驟 1：從 Supabase Auth 查詢 user_id
# 方法：使用 API 或直接查詢資料庫

# 如果您有 Supabase Service Role Key，可以使用以下 API 查詢：
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  未設定 SUPABASE_SERVICE_ROLE_KEY"
  echo ""
  echo "請手動查詢 user_id："
  echo "1. 登入 Supabase Dashboard"
  echo "2. 前往 Authentication > Users"
  echo "3. 搜尋 $EMAIL"
  echo "4. 複製 User ID"
  echo ""
  read -p "請輸入 User ID: " USER_ID
else
  # 使用 Supabase API 查詢
  SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://your-project.supabase.co}"

  USER_ID=$(curl -s \
    "${SUPABASE_URL}/auth/v1/admin/users" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    | jq -r ".users[] | select(.email == \"$EMAIL\") | .id")
fi

if [ -z "$USER_ID" ]; then
  echo "❌ 找不到用戶"
  exit 1
fi

echo "✅ 找到用戶 ID: $USER_ID"
echo ""

# 步驟 2：查詢目前資料量
echo "📊 查詢目前資料量..."

pnpm exec wrangler d1 execute quotation-system-db \
  --remote \
  --command "
    SELECT
      (SELECT COUNT(*) FROM quotations WHERE user_id = '$USER_ID') as quotations,
      (SELECT COUNT(*) FROM customers WHERE user_id = '$USER_ID') as customers,
      (SELECT COUNT(*) FROM products WHERE user_id = '$USER_ID') as products,
      (SELECT COUNT(*) FROM contracts WHERE user_id = '$USER_ID') as contracts,
      (SELECT COUNT(*) FROM payment_schedules WHERE user_id = '$USER_ID') as payments
  "

echo ""

# 步驟 3：確認刪除
echo "⚠️  警告：此操作將永久刪除以下資料："
echo "  - 所有報價單"
echo "  - 所有客戶"
echo "  - 所有產品"
echo "  - 所有合約"
echo "  - 所有付款記錄"
echo "  - 所有公司資料"
echo ""
read -p "確定要繼續嗎？(輸入 YES 繼續): " confirm

if [ "$confirm" != "YES" ]; then
  echo "操作已取消"
  exit 0
fi

# 步驟 4：執行清理
echo ""
echo "🗑️  清理中..."

pnpm exec wrangler d1 execute quotation-system-db \
  --remote \
  --command "
    DELETE FROM payment_schedules WHERE user_id = '$USER_ID';
    DELETE FROM payment_terms WHERE user_id = '$USER_ID';
    DELETE FROM contracts WHERE user_id = '$USER_ID';
    DELETE FROM quotation_items WHERE quotation_id IN (SELECT id FROM quotations WHERE user_id = '$USER_ID');
    DELETE FROM quotations WHERE user_id = '$USER_ID';
    DELETE FROM products WHERE user_id = '$USER_ID';
    DELETE FROM customers WHERE user_id = '$USER_ID';
    DELETE FROM company_members WHERE user_id = '$USER_ID';
  "

echo ""
echo "✅ 清理完成！"
echo ""

# 步驟 5：驗證結果
echo "📊 驗證清理結果..."

pnpm exec wrangler d1 execute quotation-system-db \
  --remote \
  --command "
    SELECT
      (SELECT COUNT(*) FROM quotations WHERE user_id = '$USER_ID') as quotations,
      (SELECT COUNT(*) FROM customers WHERE user_id = '$USER_ID') as customers,
      (SELECT COUNT(*) FROM products WHERE user_id = '$USER_ID') as products,
      (SELECT COUNT(*) FROM contracts WHERE user_id = '$USER_ID') as contracts,
      (SELECT COUNT(*) FROM payment_schedules WHERE user_id = '$USER_ID') as payments
  "

echo ""
echo "✅ 完成！您可以重新登入查看結果。"
