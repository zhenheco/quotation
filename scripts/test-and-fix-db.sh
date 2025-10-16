#!/bin/bash

###############################################################################
# 測試並修復資料庫連接
###############################################################################

set -e

echo "🔍 檢查開發伺服器..."
if ! curl -s http://localhost:3000/api/exchange-rates > /dev/null 2>&1; then
    echo "⚠️  開發伺服器未運行，啟動中..."
    npm run dev &
    sleep 10
fi

echo ""
echo "📊 測試 1: 獲取匯率 API"
echo "======================================"
RESPONSE=$(curl -s http://localhost:3000/api/exchange-rates)
echo "$RESPONSE" | jq '.'

# 檢查匯率是否全是 1
if echo "$RESPONSE" | jq -e '.rates.TWD == 1 and .rates.EUR == 1' > /dev/null; then
    echo ""
    echo "⚠️  警告: 匯率都是 1，可能是資料庫寫入權限問題"
    echo ""
    echo "📝 建議執行以下步驟:"
    echo "1. 登入 Zeabur PostgreSQL"
    echo "2. 執行 SQL: "
    echo ""
    cat supabase-migrations/002_fix_exchange_rates_rls.sql
    echo ""
else
    echo "✅ 匯率正常！"
fi

echo ""
echo "📊 測試 2: 同步匯率"
echo "======================================"
curl -X POST http://localhost:3000/api/exchange-rates/sync \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency":"USD"}' | jq '.'

echo ""
echo "📊 測試 3: 再次獲取匯率（檢查是否已同步）"
echo "======================================"
sleep 2
curl -s http://localhost:3000/api/exchange-rates | jq '.rates'

echo ""
echo "✅ 測試完成！"
