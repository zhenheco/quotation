#!/bin/bash

# ========================================
# Zeabur PostgreSQL 業務數據設置腳本
# 執行 Zeabur 專用 schema（無 Supabase 依賴）
# ========================================

echo "🔧 Zeabur PostgreSQL 業務數據庫設置"
echo "========================================"
echo ""

# 檢查環境變數
if [ -z "$ZEABUR_POSTGRES_URL" ]; then
    echo "❌ 錯誤：ZEABUR_POSTGRES_URL 未設定"
    echo ""
    echo "請在 .env.local 中設定："
    echo "ZEABUR_POSTGRES_URL=postgresql://user:password@host:port/database"
    echo ""
    echo "範例（從 Zeabur Dashboard 複製）："
    echo "ZEABUR_POSTGRES_URL=postgresql://root:YOUR_PASSWORD@YOUR_HOST:PORT/zeabur"
    echo ""
    exit 1
fi

echo "✅ ZEABUR_POSTGRES_URL 已設定"
echo ""

# 測試連接
echo "📡 測試連接..."
PGPASSWORD=$(echo "$ZEABUR_POSTGRES_URL" | sed -E 's/.*:([^@]+)@.*/\1/') \
psql "$ZEABUR_POSTGRES_URL" -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ 連接失敗！"
    echo ""
    echo "請檢查："
    echo "  1. ZEABUR_POSTGRES_URL 是否正確"
    echo "  2. Zeabur PostgreSQL 服務是否運行中"
    echo "  3. 網路連接是否正常"
    echo ""
    exit 1
fi

echo "✅ 連接成功！"
echo ""

# 執行 schema
echo "📋 執行 Zeabur Schema..."
echo "----------------------------------------"
echo "即將："
echo "  • 刪除所有現有業務表"
echo "  • 重建表結構（無 Supabase 依賴）"
echo "  • 創建索引和觸發器"
echo ""

read -p "確認執行？(y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消執行"
    exit 1
fi

# 執行 SQL
PGPASSWORD=$(echo "$ZEABUR_POSTGRES_URL" | sed -E 's/.*:([^@]+)@.*/\1/') \
psql "$ZEABUR_POSTGRES_URL" -f supabase-migrations/zeabur-schema.sql

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Schema 執行失敗"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Zeabur PostgreSQL 設置完成！"
echo "=========================================="
echo ""
echo "創建的表："
echo "  ✅ customers"
echo "  ✅ products"
echo "  ✅ quotations"
echo "  ✅ quotation_items"
echo "  ✅ exchange_rates"
echo ""
echo "下一步："
echo "  1. 確認 .env.local 中 ZEABUR_POSTGRES_URL 正確"
echo "  2. 重啟開發服務：rm -rf .next && npm run dev"
echo "  3. 開始使用系統"
echo ""
