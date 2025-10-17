#!/bin/bash

# 開發環境啟動腳本
# 包含所有必要的檢查和初始化

set -e  # 遇到錯誤時立即退出

echo "========================================"
echo "🚀 報價單系統 - 開發環境啟動"
echo "========================================"
echo ""

# 檢查 .env.local 是否存在
if [ ! -f .env.local ]; then
    echo "❌ 錯誤：.env.local 檔案不存在"
    echo ""
    echo "請執行以下步驟："
    echo "1. 複製 .env.local.example 為 .env.local"
    echo "2. 填入您的環境變數"
    echo ""
    exit 1
fi

# 檢查必要的環境變數
source .env.local

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ 錯誤：NEXT_PUBLIC_SUPABASE_URL 未設定"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ 錯誤：NEXT_PUBLIC_SUPABASE_ANON_KEY 未設定"
    exit 1
fi

echo "✅ 環境變數檢查通過"
echo ""

# 安裝依賴（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴套件..."
    npm install
    echo "✅ 依賴安裝完成"
    echo ""
fi

# 啟動開發伺服器
echo "🚀 啟動開發伺服器..."
echo ""
echo "服務將在以下位址運行："
echo "  http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止伺服器"
echo "========================================"
echo ""

npm run dev
