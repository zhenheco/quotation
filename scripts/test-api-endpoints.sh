#!/bin/bash

# ============================================================================
# API Endpoints Testing Script
# 測試合約管理和收款管理 API 端點
# ============================================================================

# 設定 API Base URL
API_URL="${API_URL:-http://localhost:3000}"

# 顏色設定
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 測試結果統計
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ============================================================================
# 輔助函式
# ============================================================================

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_test() {
    echo -e "${YELLOW}▶ 測試: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ 成功: $1${NC}"
    ((PASSED_TESTS++))
}

print_error() {
    echo -e "${RED}✗ 失敗: $1${NC}"
    ((FAILED_TESTS++))
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# 執行 API 測試
test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    ((TOTAL_TESTS++))

    print_test "$description"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_success "HTTP $http_code"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 0
    else
        print_error "HTTP $http_code"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        return 1
    fi
}

# ============================================================================
# 主要測試流程
# ============================================================================

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                               ║${NC}"
echo -e "${GREEN}║  合約管理和收款管理 API 端點測試                                ║${NC}"
echo -e "${GREEN}║                                                               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

print_info "API Base URL: $API_URL"
print_info "開始時間: $(date '+%Y-%m-%d %H:%M:%S')"

# ============================================================================
# 1. 合約管理 API 測試
# ============================================================================

print_section "1️⃣  合約管理 API 測試"

# 注意：這些測試需要有效的 session token
# 實際使用時需要先登入並取得 session

# 1.1 查詢逾期合約
test_api "GET" "/api/contracts/overdue" "" \
    "查詢有逾期款項的合約"

sleep 1

# ============================================================================
# 2. 收款管理 API 測試
# ============================================================================

print_section "2️⃣  收款管理 API 測試"

# 2.1 查詢已收款列表
test_api "GET" "/api/payments/collected" "" \
    "查詢已收款列表"

sleep 1

# 2.2 查詢未收款列表
test_api "GET" "/api/payments/unpaid" "" \
    "查詢未收款列表（>30天）"

sleep 1

# 2.3 查詢收款提醒
test_api "GET" "/api/payments/reminders?days_ahead=30" "" \
    "查詢下次收款提醒（未來30天）"

sleep 1

# 2.4 查詢收款提醒（即將到期）
test_api "GET" "/api/payments/reminders?status=due_soon" "" \
    "查詢即將到期的收款提醒"

sleep 1

# ============================================================================
# 3. 測試總結
# ============================================================================

print_section "📊 測試總結"

echo "總測試數: $TOTAL_TESTS"
echo -e "${GREEN}通過: $PASSED_TESTS${NC}"
echo -e "${RED}失敗: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 所有測試通過！${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  有 $FAILED_TESTS 個測試失敗${NC}"
    exit 1
fi
