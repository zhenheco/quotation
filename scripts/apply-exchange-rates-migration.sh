#!/bin/bash

###############################################################################
# 套用匯率表 RLS 政策修復 Migration
# 用途：修復 exchange_rates 表的權限問題，允許已驗證用戶寫入資料
###############################################################################

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}套用匯率表 RLS 政策修復${NC}"
echo -e "${GREEN}========================================${NC}"

# 檢查環境變數
if [ -z "$SUPABASE_DB_URL" ]; then
  echo -e "${RED}❌ 錯誤: SUPABASE_DB_URL 環境變數未設定${NC}"
  echo "請在 .env.local 中設定 SUPABASE_DB_URL"
  exit 1
fi

# 取得專案根目錄
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATION_FILE="$PROJECT_ROOT/supabase-migrations/002_fix_exchange_rates_rls.sql"

# 檢查 migration 檔案是否存在
if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}❌ 錯誤: Migration 檔案不存在${NC}"
  echo "路徑: $MIGRATION_FILE"
  exit 1
fi

echo -e "${YELLOW}📄 Migration 檔案: $MIGRATION_FILE${NC}"
echo ""

# 套用 migration
echo -e "${YELLOW}🔄 正在套用 migration...${NC}"

if command -v psql &> /dev/null; then
  psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"
  echo ""
  echo -e "${GREEN}✅ Migration 套用成功！${NC}"
else
  echo -e "${RED}❌ 錯誤: psql 未安裝${NC}"
  echo "請安裝 PostgreSQL 客戶端工具"
  exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}接下來的步驟：${NC}"
echo "1. 測試匯率 API: curl http://localhost:3000/api/exchange-rates"
echo "2. 測試同步功能: curl -X POST http://localhost:3000/api/exchange-rates/sync"
