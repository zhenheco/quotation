#!/bin/bash

echo "=== 診斷 API 問題 ==="
echo ""

# 從環境變數獲取資料庫連接
source .env.local 2>/dev/null || true

echo "1. 檢查用戶帳號: acejou27@gmail.com"
echo ""

# 查詢用戶資訊
PGPASSWORD='kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W' psql \
  -h zeabur-us-dal-cloud.zeabur.com \
  -p 6379 \
  -U postgres \
  -d quotation_system \
  -c "SELECT id, email, created_at FROM users WHERE email = 'acejou27@gmail.com';"

echo ""
echo "2. 檢查該用戶的產品數量"
echo ""

USER_ID=$(PGPASSWORD='kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W' psql \
  -h zeabur-us-dal-cloud.zeabur.com \
  -p 6379 \
  -U postgres \
  -d quotation_system \
  -t -c "SELECT id FROM users WHERE email = 'acejou27@gmail.com';" | xargs)

if [ -n "$USER_ID" ]; then
  echo "用戶 ID: $USER_ID"
  echo ""

  PGPASSWORD='kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W' psql \
    -h zeabur-us-dal-cloud.zeabur.com \
    -p 6379 \
    -U postgres \
    -d quotation_system \
    -c "SELECT id, name, unit_price, cost_price, created_at FROM products WHERE user_id = '$USER_ID' ORDER BY created_at DESC LIMIT 5;"

  echo ""
  echo "3. 檢查該用戶的客戶數量"
  echo ""

  PGPASSWORD='kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W' psql \
    -h zeabur-us-dal-cloud.zeabur.com \
    -p 6379 \
    -U postgres \
    -d quotation_system \
    -c "SELECT id, name, email, created_at FROM customers WHERE user_id = '$USER_ID' ORDER BY created_at DESC LIMIT 5;"

  echo ""
  echo "4. 檢查該用戶的報價單數量"
  echo ""

  PGPASSWORD='kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W' psql \
    -h zeabur-us-dal-cloud.zeabur.com \
    -p 6379 \
    -U postgres \
    -d quotation_system \
    -c "SELECT id, quotation_number, status, created_at FROM quotations WHERE user_id = '$USER_ID' ORDER BY created_at DESC LIMIT 5;"

  echo ""
  echo "5. 檢查是否有測試資料標記"
  echo ""

  PGPASSWORD='kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W' psql \
    -h zeabur-us-dal-cloud.zeabur.com \
    -p 6379 \
    -U postgres \
    -d quotation_system \
    -c "SELECT name FROM products WHERE user_id = '$USER_ID' AND (name LIKE '%測試%' OR name LIKE '%test%') LIMIT 10;"

  PGPASSWORD='kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W' psql \
    -h zeabur-us-dal-cloud.zeabur.com \
    -p 6379 \
    -U postgres \
    -d quotation_system \
    -c "SELECT name FROM customers WHERE user_id = '$USER_ID' AND (name LIKE '%測試%' OR name LIKE '%test%') LIMIT 10;"

else
  echo "❌ 找不到用戶"
fi

echo ""
echo "=== 診斷完成 ==="
