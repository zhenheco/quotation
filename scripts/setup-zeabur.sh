#!/bin/bash

# ========================================
# Zeabur PostgreSQL Schema 設置腳本
# 自動從 .env.local 載入環境變數
# ========================================

echo "🔧 Zeabur PostgreSQL 業務數據庫設置"
echo "========================================"
echo ""

# 從 .env.local 載入環境變數
if [ -f .env.local ]; then
    echo "📋 載入 .env.local..."
    export $(cat .env.local | grep -v '^#' | grep ZEABUR_POSTGRES_URL | xargs)
fi

# 檢查環境變數
if [ -z "$ZEABUR_POSTGRES_URL" ]; then
    echo "❌ 錯誤：ZEABUR_POSTGRES_URL 未設定"
    echo ""
    echo "請確認 .env.local 中有以下設定："
    echo "ZEABUR_POSTGRES_URL=postgresql://user:password@host:port/database"
    echo ""
    echo "目前 .env.local 內容（只顯示 ZEABUR 相關）："
    grep ZEABUR .env.local 2>/dev/null || echo "（找不到 ZEABUR 相關設定）"
    echo ""
    exit 1
fi

echo "✅ ZEABUR_POSTGRES_URL 已載入"
echo ""

# 遮蔽密碼顯示
MASKED_URL=$(echo "$ZEABUR_POSTGRES_URL" | sed -E 's/:([^@]+)@/:****@/')
echo "📡 連接到: $MASKED_URL"
echo ""

# 測試連接
echo "🔍 測試連接..."
PGPASSWORD=$(echo "$ZEABUR_POSTGRES_URL" | sed -E 's/.*:([^@]+)@.*/\1/') \
psql "$ZEABUR_POSTGRES_URL" -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ 連接失敗！"
    echo ""
    echo "請檢查："
    echo "  1. ZEABUR_POSTGRES_URL 格式是否正確"
    echo "  2. Zeabur PostgreSQL 服務是否運行中"
    echo "  3. 密碼是否正確"
    echo ""
    echo "格式範例："
    echo "postgresql://root:password@host.zeabur.app:5432/zeabur"
    echo ""
    exit 1
fi

echo "✅ 連接成功！"
echo ""

# 執行 schema
echo "📋 執行 Zeabur Schema..."
echo "----------------------------------------"
echo "即將："
echo "  • 刪除所有現有業務表（如有）"
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
echo "⚙️  執行中..."
PGPASSWORD=$(echo "$ZEABUR_POSTGRES_URL" | sed -E 's/.*:([^@]+)@.*/\1/') \
psql "$ZEABUR_POSTGRES_URL" -f supabase-migrations/zeabur-schema.sql

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Schema 執行失敗"
    echo ""
    echo "常見問題："
    echo "  1. 權限不足 - 確認使用的是管理員帳號"
    echo "  2. 語法錯誤 - 檢查 SQL 文件"
    echo "  3. 表已存在且有依賴 - 需要手動清理"
    echo ""
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Zeabur PostgreSQL 設置完成！"
echo "=========================================="
echo ""
echo "創建的表："
echo "  ✅ customers (客戶表)"
echo "  ✅ products (產品表)"
echo "  ✅ quotations (報價單表)"
echo "  ✅ quotation_items (報價單項目表)"
echo "  ✅ exchange_rates (匯率表)"
echo ""
echo "下一步："
echo "  1. 重啟開發服務："
echo "     rm -rf .next && npm run dev"
echo ""
echo "  2. 測試功能："
echo "     http://localhost:3000/zh/customers"
echo "     http://localhost:3000/zh/products"
echo "     http://localhost:3000/zh/quotations"
echo ""
