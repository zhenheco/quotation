#!/bin/bash

# ========================================
# 測試數據匯入腳本
# 預設使用 --dangerously-skip-permissions 跳過 RLS 權限檢查
# ========================================

echo "========================================"
echo "報價單系統 - 測試數據匯入工具"
echo "========================================"
echo ""

# 檢查是否已連結 Supabase 專案
if [ ! -f "supabase/.temp/project-ref" ] && [ ! -f ".git/supabase/project-ref" ]; then
  echo "⚠️  警告：您可能尚未連結到 Supabase 專案"
  echo ""
  echo "請先執行以下步驟："
  echo "1. npm run supabase:login"
  echo "2. npm run supabase:link"
  echo ""
  read -p "已完成連結？按 Enter 繼續，或 Ctrl+C 取消..."
fi

# 獲取 User ID
echo ""
echo "正在獲取您的 User ID..."
echo ""

USER_ID=$(npx supabase db execute --sql "SELECT id FROM auth.users LIMIT 1;" 2>/dev/null | grep -o '[0-9a-f]\{8\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{4\}-[0-9a-f]\{12\}' | head -1)

if [ -z "$USER_ID" ]; then
  echo "❌ 錯誤：無法獲取 User ID"
  echo ""
  echo "可能的原因："
  echo "1. 您尚未登入系統（請先使用 Google OAuth 登入一次）"
  echo "2. Supabase 連結有問題"
  echo ""
  echo "請手動執行以下步驟："
  echo "1. 前往 http://localhost:3000/login 登入一次"
  echo "2. 前往 Supabase Dashboard → Authentication → Users"
  echo "3. 複製您的 User ID"
  echo "4. 手動編輯 scripts/seed-test-data.sql，將 {USER_ID} 替換為您的 User ID"
  echo "5. 在 Supabase Dashboard → SQL Editor 執行該腳本"
  exit 1
fi

echo "✅ 成功獲取 User ID: $USER_ID"
echo ""

# 建立臨時檔案
TEMP_SQL="/tmp/seed-test-data-$(date +%s).sql"

echo "正在準備 SQL 腳本..."
sed "s/{USER_ID}/$USER_ID/g" scripts/seed-test-data.sql > "$TEMP_SQL"

echo "✅ SQL 腳本已準備完成"
echo ""

# 詢問是否要清除現有數據
echo "⚠️  注意：此操作會插入測試數據"
echo ""
read -p "是否要先清除現有的測試數據？(y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "正在清除現有數據..."
  npx supabase db execute --sql "
    DELETE FROM quotation_items;
    DELETE FROM quotations;
    DELETE FROM customers;
    DELETE FROM products;
    DELETE FROM exchange_rates;
  "
  echo "✅ 現有數據已清除"
  echo ""
fi

# 執行 SQL 腳本
echo "正在匯入測試數據..."
echo ""

if npx supabase db execute --file "$TEMP_SQL"; then
  echo ""
  echo "========================================"
  echo "✅ 測試數據匯入成功！"
  echo "========================================"
  echo ""
  echo "已建立的測試數據："
  echo "  📋 5 個客戶"
  echo "  📦 10 個產品"
  echo "  💰 5 個報價單（各種狀態）"
  echo "  💱 8 組匯率數據"
  echo ""
  echo "您現在可以："
  echo "  1. 啟動開發伺服器：npm run dev"
  echo "  2. 前往 http://localhost:3000"
  echo "  3. 使用 Google OAuth 登入"
  echo "  4. 測試各項功能"
  echo ""
  echo "查看詳細說明："
  echo "  cat scripts/README-seed-data.md"
  echo "========================================"
else
  echo ""
  echo "❌ 匯入失敗！"
  echo ""
  echo "請檢查錯誤訊息，或手動執行："
  echo "  npx supabase db execute --file $TEMP_SQL"
  exit 1
fi

# 清除臨時檔案
rm -f "$TEMP_SQL"

echo ""
