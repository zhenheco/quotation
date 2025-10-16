#!/bin/bash

###############################################################################
# 測試匯率功能腳本
# 用途：測試匯率 API 的所有功能
###############################################################################

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost:3000}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}測試匯率功能${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Base URL: $BASE_URL${NC}"
echo ""

# 測試 1: 獲取匯率 (預設 USD)
echo -e "${YELLOW}測試 1: 獲取匯率 (預設 USD 基準)${NC}"
echo "GET $BASE_URL/api/exchange-rates"
echo ""
curl -s "$BASE_URL/api/exchange-rates" | jq '.'
echo ""
echo ""

# 測試 2: 獲取匯率 (指定 TWD 基準)
echo -e "${YELLOW}測試 2: 獲取匯率 (TWD 基準)${NC}"
echo "GET $BASE_URL/api/exchange-rates?base=TWD"
echo ""
curl -s "$BASE_URL/api/exchange-rates?base=TWD" | jq '.'
echo ""
echo ""

# 測試 3: 同步匯率到資料庫
echo -e "${YELLOW}測試 3: 同步匯率到資料庫${NC}"
echo "POST $BASE_URL/api/exchange-rates/sync"
echo ""
curl -s -X POST "$BASE_URL/api/exchange-rates/sync" \
  -H "Content-Type: application/json" \
  -d '{"baseCurrency": "USD"}' | jq '.'
echo ""
echo ""

# 測試 4: 再次獲取匯率（應該從資料庫讀取）
echo -e "${YELLOW}測試 4: 再次獲取匯率（從資料庫讀取）${NC}"
echo "GET $BASE_URL/api/exchange-rates"
echo ""
curl -s "$BASE_URL/api/exchange-rates" | jq '.'
echo ""
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}測試完成！${NC}"
echo -e "${GREEN}========================================${NC}"
