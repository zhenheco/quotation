#!/bin/bash

# ========================================
# Supabase Migration 執行腳本
# 自動執行 000_drop_and_recreate.sql
# ========================================

echo "🔧 Supabase Migration Tool"
echo "========================================"
echo ""

# 檢查 SQL 文件是否存在
SQL_FILE="supabase-migrations/000_drop_and_recreate.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ 錯誤：找不到 SQL 文件 $SQL_FILE"
    exit 1
fi

echo "📋 本腳本將執行以下操作："
echo "  1. 刪除所有現有業務表（customers, products, quotations 等）"
echo "  2. 重建所有表結構（包含 sku 欄位和正確的欄位名稱）"
echo "  3. 設定 RLS 策略和索引"
echo ""
echo "⚠️  警告：這將刪除所有現有數據！"
echo ""

# 提供三種執行方式
echo "請選擇執行方式："
echo ""
echo "方式 1️⃣ : 使用 Supabase Dashboard（推薦）"
echo "-------------------------------------"
echo "1. 打開 https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/sql/new"
echo "2. 複製以下命令來查看 SQL 內容："
echo "   cat $SQL_FILE"
echo "3. 將 SQL 內容複製到 Dashboard 的 SQL Editor"
echo "4. 點擊 'Run' 按鈕執行"
echo ""

echo "方式 2️⃣ : 使用 psql 命令（需要 Database Password）"
echo "-------------------------------------"
echo "從 Supabase Dashboard > Settings > Database 取得連接資訊，然後執行："
echo "psql 'postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres' -f $SQL_FILE"
echo ""

echo "方式 3️⃣ : 使用 Supabase CLI（需要先安裝 CLI）"
echo "-------------------------------------"
echo "npx supabase db push --db-url 'postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres'"
echo ""

# 顯示 SQL 內容摘要
echo "=========================================="
echo "📄 SQL Migration 內容摘要："
echo "=========================================="
echo ""
echo "DROP TABLES:"
echo "  • quotation_items"
echo "  • quotations"
echo "  • products"
echo "  • customers"
echo "  • exchange_rates"
echo ""
echo "CREATE TABLES:"
echo "  • customers (with tax_id, contact_person)"
echo "  • products (with sku ✅, unit_price ✅)"
echo "  • quotations (with total_amount ✅)"
echo "  • quotation_items"
echo "  • exchange_rates"
echo ""
echo "CREATE POLICIES:"
echo "  • RLS enabled for all tables"
echo "  • User isolation policies (auth.uid())"
echo "  • Safe multi-tenant access"
echo ""

echo "=========================================="
echo "❓ 需要查看完整 SQL 內容？執行："
echo "   cat $SQL_FILE"
echo "=========================================="
