#!/bin/bash

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}\n🚀 準備執行 Supabase Migration${NC}"
echo -e "${CYAN}========================================${NC}"
echo -e "執行時間: $(date '+%Y-%m-%d %H:%M:%S')\n"

# 複製 SQL 到剪貼簿
MIGRATION_FILE="supabase-migrations/004_zeabur_tables_migration.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}❌ 錯誤: 找不到 migration 文件${NC}"
  echo -e "預期路徑: $MIGRATION_FILE"
  exit 1
fi

echo -e "${BLUE}📋 複製 migration SQL 到剪貼簿...${NC}"
pbcopy < "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ SQL 已複製到剪貼簿！${NC}\n"
else
  echo -e "${YELLOW}⚠️  複製失敗，請手動複製文件內容${NC}\n"
fi

# 打開 Supabase SQL Editor
echo -e "${BLUE}🌐 正在打開 Supabase SQL Editor...${NC}"
open "https://supabase.com/dashboard/project/nxlqtnnssfzzpbyfjnby/editor"

echo -e "\n${BOLD}${GREEN}✨ 接下來的步驟:${NC}"
echo -e "${CYAN}1. 在打開的瀏覽器中登入 Supabase"
echo -e "2. 點擊左側的 'SQL Editor'"
echo -e "3. 點擊 '+ New query'"
echo -e "4. 按 Cmd+V 貼上 SQL（已在剪貼簿中）"
echo -e "5. 點擊右下角的 'Run' 按鈕（或按 Cmd+Enter）"
echo -e "6. 等待執行完成（約 5-10 秒）"
echo -e "7. 應該會看到 'Success' 訊息${NC}\n"

echo -e "${BOLD}驗證建立的表:${NC}"
echo -e "${CYAN}執行此查詢來驗證:"
echo -e "SELECT table_name FROM information_schema.tables"
echo -e "WHERE table_schema = 'public'"
echo -e "AND table_name IN ("
echo -e "  'roles', 'permissions', 'role_permissions',"
echo -e "  'user_roles', 'user_profiles', 'companies',"
echo -e "  'company_members', 'company_settings',"
echo -e "  'customer_contracts', 'payments', 'payment_schedules',"
echo -e "  'audit_logs', 'quotation_shares', 'quotation_versions'"
echo -e ") ORDER BY table_name;${NC}\n"

echo -e "${YELLOW}應該返回 14 筆記錄${NC}\n"

echo -e "${BOLD}完成後請回到此終端繼續執行資料遷移！${NC}\n"
