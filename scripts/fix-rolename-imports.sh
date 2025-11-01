#!/bin/bash

# 修復 RoleName 導入錯誤

FILES=(
  "app/test-permissions/page.tsx"
  "components/permission/MemberList.tsx"
  "components/permission/RoleSelector.tsx"
  "hooks/permission/useCompanies.ts"
  "hooks/permission/useCompanyMembers.ts"
  "hooks/permission/usePermissions.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # 替換單獨的 RoleName 導入
    sed -i '' "s|import { RoleName } from '@/types/extended.types'|import { RoleName } from '@/types/rbac.types'|g" "$file"

    # 如果 RoleName 是和其他類型一起導入的，需要分開
    if grep -q "import {.*RoleName.*} from '@/types/extended.types'" "$file"; then
      # 這個情況比較複雜，需要手動處理
      echo "⚠️  $file 需要手動修復（RoleName 和其他類型混合導入）"
    else
      echo "✓ 修復 $file"
    fi
  else
    echo "⚠️  文件不存在: $file"
  fi
done

echo "完成"
