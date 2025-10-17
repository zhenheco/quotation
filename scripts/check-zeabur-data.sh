#!/bin/bash

# ========================================
# Zeabur PostgreSQL 數據檢查腳本
# 幫助決定使用 Supabase 還是 Zeabur
# ========================================

echo "🔍 Zeabur PostgreSQL 數據檢查工具"
echo "========================================"
echo ""

# 檢查 ZEABUR_POSTGRES_URL 環境變數
if [ -z "$ZEABUR_POSTGRES_URL" ]; then
    echo "❌ ZEABUR_POSTGRES_URL 未設定"
    echo ""
    echo "請在 .env.local 中設定："
    echo "ZEABUR_POSTGRES_URL=postgresql://user:password@host:port/database"
    echo ""
    echo "或者暫時設定："
    echo "export ZEABUR_POSTGRES_URL='postgresql://...'"
    echo ""
    exit 1
fi

echo "✅ ZEABUR_POSTGRES_URL 已設定"
echo ""

# 測試連接
echo "📡 測試 Zeabur PostgreSQL 連接..."
PGPASSWORD=$(echo "$ZEABUR_POSTGRES_URL" | sed -E 's/.*:([^@]+)@.*/\1/') \
psql "$ZEABUR_POSTGRES_URL" -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ 連接失敗！請檢查 ZEABUR_POSTGRES_URL 是否正確"
    exit 1
fi

echo "✅ 連接成功！"
echo ""

# 檢查表是否存在
echo "📊 檢查業務表..."
echo "----------------------------------------"

TABLES=("customers" "products" "quotations" "quotation_items" "exchange_rates")
EXISTING_TABLES=()

for table in "${TABLES[@]}"; do
    PGPASSWORD=$(echo "$ZEABUR_POSTGRES_URL" | sed -E 's/.*:([^@]+)@.*/\1/') \
    psql "$ZEABUR_POSTGRES_URL" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" | grep -q 't'

    if [ $? -eq 0 ]; then
        echo "✅ $table 表存在"
        EXISTING_TABLES+=("$table")
    else
        echo "❌ $table 表不存在"
    fi
done

echo ""

# 如果沒有任何表存在
if [ ${#EXISTING_TABLES[@]} -eq 0 ]; then
    echo "📋 結論：Zeabur PostgreSQL 沒有業務表"
    echo "========================================"
    echo ""
    echo "建議：✅ 使用 Supabase 作為業務數據庫"
    echo ""
    echo "理由："
    echo "  • Zeabur 上沒有需要遷移的數據"
    echo "  • 代碼已經使用 Supabase 客戶端"
    echo "  • 零代碼改動，立即可用"
    echo ""
    echo "下一步："
    echo "  1. rm -rf .next"
    echo "  2. npm run dev"
    echo "  3. 訪問 http://localhost:3000/zh/customers/new 創建數據"
    echo ""
    exit 0
fi

# 檢查數據量
echo "📈 統計數據量..."
echo "----------------------------------------"

TOTAL_ROWS=0

for table in "${EXISTING_TABLES[@]}"; do
    COUNT=$(PGPASSWORD=$(echo "$ZEABUR_POSTGRES_URL" | sed -E 's/.*:([^@]+)@.*/\1/') \
    psql "$ZEABUR_POSTGRES_URL" -tAc "SELECT COUNT(*) FROM $table;")

    echo "$table: $COUNT 筆"
    TOTAL_ROWS=$((TOTAL_ROWS + COUNT))
done

echo ""
echo "總計：$TOTAL_ROWS 筆數據"
echo ""

# 根據數據量給建議
echo "📋 建議方案"
echo "========================================"
echo ""

if [ $TOTAL_ROWS -eq 0 ]; then
    echo "✅ 推薦：使用 Supabase"
    echo ""
    echo "理由："
    echo "  • Zeabur 上有表但沒有數據"
    echo "  • 代碼已經使用 Supabase 客戶端"
    echo "  • 零代碼改動，立即可用"
    echo ""
    echo "下一步："
    echo "  1. rm -rf .next"
    echo "  2. npm run dev"
    echo "  3. 訪問 http://localhost:3000/zh/customers/new 創建數據"

elif [ $TOTAL_ROWS -lt 100 ]; then
    echo "✅ 推薦：遷移到 Supabase"
    echo ""
    echo "理由："
    echo "  • 數據量較小（$TOTAL_ROWS 筆），遷移快速"
    echo "  • 代碼已經使用 Supabase 客戶端"
    echo "  • RLS 自動保護，更安全"
    echo ""
    echo "下一步："
    echo "  1. 導出 Zeabur 數據："
    echo "     pg_dump \"$ZEABUR_POSTGRES_URL\" --data-only \\"
    echo "       --table=customers --table=products --table=quotations \\"
    echo "       --table=quotation_items > zeabur_data.sql"
    echo ""
    echo "  2. 導入到 Supabase（需要 Database Password）："
    echo "     psql 'postgresql://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres' \\"
    echo "       -f zeabur_data.sql"
    echo ""
    echo "  3. 重啟服務："
    echo "     rm -rf .next && npm run dev"

elif [ $TOTAL_ROWS -lt 1000 ]; then
    echo "⚠️  兩個選項都可行"
    echo ""
    echo "選項 A：遷移到 Supabase"
    echo "  優點：代碼零改動，RLS 保護"
    echo "  缺點：需要遷移 $TOTAL_ROWS 筆數據（約 10-30 分鐘）"
    echo ""
    echo "選項 B：繼續使用 Zeabur"
    echo "  優點：數據不需要遷移"
    echo "  缺點：需要重寫 20+ 個文件（約 4-6 小時）"
    echo ""
    echo "建議：如果您想快速繼續開發，選擇 A"

else
    echo "⚠️  建議：繼續使用 Zeabur PostgreSQL"
    echo ""
    echo "理由："
    echo "  • 數據量較大（$TOTAL_ROWS 筆）"
    echo "  • 遷移時間較長，有風險"
    echo ""
    echo "注意：需要重寫所有業務邏輯（約 4-6 小時工作量）"
    echo ""
    echo "下一步："
    echo "  1. 查看詳細指南："
    echo "     cat docs/DATABASE_MIGRATION_DECISION.md"
    echo ""
    echo "  2. 決定是否要投入時間重構"
fi

echo ""
echo "========================================"
echo "🔗 完整決策指南："
echo "   docs/DATABASE_MIGRATION_DECISION.md"
echo "========================================"
