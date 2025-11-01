#!/bin/bash

# TypeScript 錯誤批量修復腳本

echo "開始修復 TypeScript 類型錯誤..."

# 1. 修復所有缺少 NextRequest 導入的文件
echo "修復 NextRequest 導入..."
for file in \
  "app/api/contracts/[id]/next-collection/route.ts" \
  "app/api/contracts/[id]/payment-progress/route.ts" \
  "app/api/payments/[id]/mark-overdue/route.ts"; do

  if [ -f "$file" ]; then
    # 檢查是否已經導入 NextRequest
    if ! grep -q "NextRequest" "$file"; then
      # 在 NextResponse 導入處添加 NextRequest
      sed -i '' 's/import { NextResponse } from/import { NextRequest, NextResponse } from/' "$file"
      echo "✓ 修復 $file"
    fi
  fi
done

# 2. 修復 params 類型錯誤 - 將 Promise 類型改為直接對象
echo "修復 params 類型..."
for file in \
  "app/api/companies/[id]/members/[userId]/route.ts" \
  "app/api/companies/[id]/members/route.ts" \
  "app/api/companies/[id]/route.ts"; do

  if [ -f "$file" ]; then
    # 移除 Promise 包裝
    sed -i '' 's/{ params }: { params: Promise<{ \([^}]*\) }> }/{ params }: { params: { \1 } }/' "$file"
    echo "✓ 修復 $file"
  fi
done

# 3. 修復 request 變數名稱（將 request 改為 _request）
echo "修復未使用的 request 參數..."
for file in \
  "app/api/exchange-rates/route.ts" \
  "app/api/seed-test-data/route.ts" \
  "app/api/test-email/route.ts"; do

  if [ -f "$file" ]; then
    # 將未使用的 request 改為 _request
    sed -i '' 's/async function GET(request/async function GET(_request/' "$file"
    sed -i '' 's/async function POST(request/async function POST(_request/' "$file"
    echo "✓ 修復 $file"
  fi
done

echo "批量修復完成"
