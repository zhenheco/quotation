#!/bin/bash

# 清空用戶資料腳本
# 使用方式：./scripts/reset-user-data.sh

echo "⚠️  警告：此操作將永久刪除您的所有業務資料！"
echo ""
echo "將刪除："
echo "  - 所有報價單"
echo "  - 所有客戶"
echo "  - 所有產品"
echo "  - 所有合約"
echo "  - 所有付款記錄"
echo "  - 所有公司資料"
echo ""
echo "保留："
echo "  - 用戶帳號（Supabase Auth）"
echo "  - RBAC 權限設定"
echo ""
read -p "確定要繼續嗎？(輸入 YES 繼續): " confirm

if [ "$confirm" != "YES" ]; then
  echo "操作已取消"
  exit 0
fi

echo ""
echo "正在清空資料..."
echo ""

# 使用 curl 呼叫 API（需要先登入獲取 session cookie）
response=$(curl -s -X DELETE http://localhost:3000/api/user/reset-data \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt -b /tmp/cookies.txt)

echo "回應："
echo "$response" | jq '.'

echo ""
echo "✅ 完成"
