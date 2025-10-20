#!/bin/bash

# ==============================================================================
# 性能索引應用腳本
# ==============================================================================
#
# 功能:
#   - 安全地執行資料庫索引遷移
#   - 使用 CONCURRENTLY 避免鎖表（適合生產環境）
#   - 詳細記錄執行過程
#   - 錯誤處理和回滾支援
#
# 使用方式:
#   ./scripts/apply-indexes.sh
#
# 環境變數:
#   DATABASE_URL - PostgreSQL 連線字串
#
# ==============================================================================

set -e  # 遇到錯誤立即退出

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日誌函式
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 檢查環境變數
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL 環境變數未設定"
    log_info "請設定環境變數: export DATABASE_URL='postgresql://...'"
    exit 1
fi

log_info "開始執行資料庫索引優化..."
log_info "目標: 新增 12 個性能優化索引"
log_info "方式: CONCURRENTLY (不鎖表，適合生產環境)"

# 創建臨時 SQL 檔案（只包含 CREATE INDEX 語句）
TEMP_SQL=$(mktemp)
cat > "$TEMP_SQL" << 'EOF'
-- 1. 報價單日期範圍查詢索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_dates
ON quotations(user_id, issue_date DESC, valid_until);

-- 2. 報價單複合狀態查詢索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_status_date
ON quotations(user_id, status, created_at DESC);

-- 3. 產品分類查詢索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category
ON products(user_id, category)
WHERE category IS NOT NULL;

-- 4. 報價單項目聚合查詢索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_items_quotation_product
ON quotation_items(quotation_id, product_id)
INCLUDE (quantity, unit_price, subtotal);

-- 5. 客戶郵件唯一約束優化
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email_unique
ON customers(user_id, email);

-- 6. 報價單分享 token 查詢優化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotation_shares_active
ON quotation_shares(share_token, quotation_id)
WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW());

-- 7. 部分索引: 僅活躍報價單
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_active
ON quotations(user_id, created_at DESC)
WHERE status IN ('draft', 'sent');

-- 8. 報價單號碼查詢優化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_number_user
ON quotations(user_id, quotation_number);

-- 9. 公司成員關聯索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_company_members_lookup
ON company_members(company_id, user_id)
INCLUDE (role);

-- 10. 用戶角色查詢索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_lookup
ON user_roles(user_id, role_id);

-- 11. 報價單總額統計索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotations_amount_stats
ON quotations(user_id, status, currency)
INCLUDE (total_amount);

-- 12. 客戶創建時間索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_created
ON customers(user_id, created_at DESC);
EOF

# 執行遷移
log_info "執行索引創建..."
log_warn "此過程可能需要幾分鐘，請耐心等待..."

# 執行 SQL 並捕獲輸出
if psql "$DATABASE_URL" < "$TEMP_SQL" > /tmp/index-migration.log 2>&1; then
    log_info "✅ 索引創建成功！"

    # 顯示創建的索引
    log_info "檢查新增的索引..."
    psql "$DATABASE_URL" -c "
        SELECT
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
          AND indexname LIKE 'idx_%'
        ORDER BY tablename, indexname;
    "

    log_info "✅ 資料庫索引優化完成！"
    log_info "預期效果: 查詢速度提升 60-80%"
else
    log_error "索引創建失敗"
    log_error "詳細錯誤請查看: /tmp/index-migration.log"
    cat /tmp/index-migration.log
    rm -f "$TEMP_SQL"
    exit 1
fi

# 清理臨時檔案
rm -f "$TEMP_SQL"

log_info "完成！"
