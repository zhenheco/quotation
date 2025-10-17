#!/bin/bash

# 驗證 API Routes 遷移腳本
# 日期: 2025-10-17

echo "======================================"
echo "API Routes 遷移驗證腳本"
echo "======================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 檢查計數器
PASS=0
FAIL=0

# 檢查函數
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} 檔案存在: $1"
    ((PASS++))
    return 0
  else
    echo -e "${RED}✗${NC} 檔案不存在: $1"
    ((FAIL++))
    return 1
  fi
}

check_no_supabase_client() {
  local file=$1
  if ! grep -q "from '@/lib/supabase/client'" "$file" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} 已移除 Supabase client: $file"
    ((PASS++))
    return 0
  else
    echo -e "${RED}✗${NC} 仍在使用 Supabase client: $file"
    ((FAIL++))
    return 1
  fi
}

check_uses_fetch() {
  local file=$1
  local endpoint=$2
  if grep -q "fetch.*$endpoint" "$file" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} 使用 fetch API ($endpoint): $file"
    ((PASS++))
    return 0
  else
    echo -e "${YELLOW}?${NC} 未找到 fetch API ($endpoint): $file (可能不適用)"
    return 1
  fi
}

echo "1. 檢查 API Routes 檔案"
echo "--------------------------------------"
check_file "app/api/products/route.ts"
check_file "app/api/products/[id]/route.ts"
check_file "app/api/quotations/route.ts"
check_file "app/api/quotations/[id]/route.ts"
echo ""

echo "2. 檢查組件已移除 Supabase Client"
echo "--------------------------------------"
check_no_supabase_client "app/[locale]/products/ProductForm.tsx"
check_no_supabase_client "app/[locale]/products/ProductList.tsx"
check_no_supabase_client "app/[locale]/quotations/QuotationForm.tsx"
check_no_supabase_client "app/[locale]/quotations/QuotationList.tsx"
check_no_supabase_client "app/[locale]/quotations/[id]/QuotationDetail.tsx"
echo ""

echo "3. 檢查組件使用 Fetch API"
echo "--------------------------------------"
check_uses_fetch "app/[locale]/products/ProductForm.tsx" "/api/products"
check_uses_fetch "app/[locale]/products/ProductList.tsx" "/api/products"
check_uses_fetch "app/[locale]/quotations/QuotationForm.tsx" "/api/quotations"
check_uses_fetch "app/[locale]/quotations/QuotationList.tsx" "/api/quotations"
check_uses_fetch "app/[locale]/quotations/[id]/QuotationDetail.tsx" "/api/quotations"
echo ""

echo "4. 驗證 API Routes 包含必要的方法"
echo "--------------------------------------"

# 檢查 Products API
if grep -q "export async function POST" app/api/products/route.ts; then
  echo -e "${GREEN}✓${NC} Products API 包含 POST 方法"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Products API 缺少 POST 方法"
  ((FAIL++))
fi

if grep -q "export async function PUT" app/api/products/\[id\]/route.ts; then
  echo -e "${GREEN}✓${NC} Products API 包含 PUT 方法"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Products API 缺少 PUT 方法"
  ((FAIL++))
fi

if grep -q "export async function DELETE" app/api/products/\[id\]/route.ts; then
  echo -e "${GREEN}✓${NC} Products API 包含 DELETE 方法"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Products API 缺少 DELETE 方法"
  ((FAIL++))
fi

# 檢查 Quotations API
if grep -q "export async function POST" app/api/quotations/route.ts; then
  echo -e "${GREEN}✓${NC} Quotations API 包含 POST 方法"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Quotations API 缺少 POST 方法"
  ((FAIL++))
fi

if grep -q "export async function PUT" app/api/quotations/\[id\]/route.ts; then
  echo -e "${GREEN}✓${NC} Quotations API 包含 PUT 方法"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Quotations API 缺少 PUT 方法"
  ((FAIL++))
fi

if grep -q "export async function DELETE" app/api/quotations/\[id\]/route.ts; then
  echo -e "${GREEN}✓${NC} Quotations API 包含 DELETE 方法"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Quotations API 缺少 DELETE 方法"
  ((FAIL++))
fi

echo ""
echo "5. 檢查 API Routes 包含認證邏輯"
echo "--------------------------------------"

for file in app/api/products/route.ts app/api/products/\[id\]/route.ts app/api/quotations/route.ts app/api/quotations/\[id\]/route.ts; do
  if grep -q "supabase.auth.getUser()" "$file"; then
    echo -e "${GREEN}✓${NC} 包含用戶認證: $file"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} 缺少用戶認證: $file"
    ((FAIL++))
  fi
done

echo ""
echo "======================================"
echo "驗證結果"
echo "======================================"
echo -e "通過: ${GREEN}$PASS${NC}"
echo -e "失敗: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✓ 所有檢查通過！${NC}"
  exit 0
else
  echo -e "${RED}✗ 部分檢查失敗，請查看上方詳細資訊${NC}"
  exit 1
fi
