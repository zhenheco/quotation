#!/bin/bash

# 批量修復所有使用 createClient 的 API 路由

echo "開始批量修復 API 路由..."

# 找出所有使用 createClient 的檔案
files=$(grep -r "createClient.*from.*@/lib/supabase/server" app/api/ -l)

count=0
for file in $files; do
  echo "修復: $file"

  # 1. 替換 import 語句
  sed -i.bak "s|import { createClient } from '@/lib/supabase/server'|import { createApiClient } from '@/lib/supabase/api'|g" "$file"

  # 2. 替換 createClient() 調用為 createApiClient(request)
  sed -i.bak "s|await createClient()|createApiClient(request)|g" "$file"

  # 3. 清理備份檔案
  rm -f "${file}.bak"

  ((count++))
done

echo "完成！共修復 $count 個檔案"
