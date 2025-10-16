#!/bin/bash

##############################################################################
# 執行完整測試套件並生成報告
# 用法: ./scripts/tests/run-all-tests.sh
##############################################################################

set -e

echo "=================================================="
echo "報價單管理系統 - 完整測試套件"
echo "=================================================="
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試結果追蹤
UNIT_TESTS_PASSED=false
COVERAGE_PASSED=false

# 1. 單元測試
echo "=================================================="
echo "第一階段: 單元測試"
echo "=================================================="
if npm run test:unit; then
  echo -e "${GREEN}✓ 單元測試通過${NC}"
  UNIT_TESTS_PASSED=true
else
  echo -e "${RED}✗ 單元測試失敗${NC}"
fi
echo ""

# 2. 覆蓋率測試
echo "=================================================="
echo "第二階段: 測試覆蓋率分析"
echo "=================================================="
if npm run test:coverage; then
  echo -e "${GREEN}✓ 覆蓋率測試通過（目標: 80%+）${NC}"
  COVERAGE_PASSED=true
else
  echo -e "${YELLOW}⚠ 覆蓋率未達到目標（80%）${NC}"
fi
echo ""

# 3. 整合測試（如果存在）
echo "=================================================="
echo "第三階段: 整合測試（可選）"
echo "=================================================="
if [ -d "tests/integration" ] && [ "$(ls -A tests/integration)" ]; then
  npm run test:integration || echo -e "${YELLOW}⚠ 整合測試未完全通過${NC}"
else
  echo -e "${YELLOW}⚠ 整合測試尚未實作${NC}"
fi
echo ""

# 4. E2E 測試（如果存在）
echo "=================================================="
echo "第四階段: E2E 測試（可選）"
echo "=================================================="
if [ -d "tests/e2e" ] && [ "$(ls -A tests/e2e)" ]; then
  npm run test:e2e || echo -e "${YELLOW}⚠ E2E 測試未完全通過${NC}"
else
  echo -e "${YELLOW}⚠ E2E 測試尚未實作${NC}"
fi
echo ""

# 生成測試報告
echo "=================================================="
echo "測試摘要"
echo "=================================================="

if [ "$UNIT_TESTS_PASSED" = true ]; then
  echo -e "${GREEN}✓ 單元測試: 通過${NC}"
else
  echo -e "${RED}✗ 單元測試: 失敗${NC}"
fi

if [ "$COVERAGE_PASSED" = true ]; then
  echo -e "${GREEN}✓ 測試覆蓋率: 達標（80%+）${NC}"
else
  echo -e "${YELLOW}⚠ 測試覆蓋率: 未達標${NC}"
fi

echo ""
echo "=================================================="
echo "覆蓋率報告位置: coverage/index.html"
echo "請使用瀏覽器打開查看詳細報告"
echo "=================================================="

# 最終狀態
if [ "$UNIT_TESTS_PASSED" = true ] && [ "$COVERAGE_PASSED" = true ]; then
  echo -e "${GREEN}✓ 所有核心測試通過！${NC}"
  exit 0
else
  echo -e "${RED}✗ 部分測試未通過，請檢查上方詳細報告${NC}"
  exit 1
fi
