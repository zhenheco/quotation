#!/bin/bash

# Gmail Email 測試腳本
# 用於測試 Gmail 設定是否正確

echo "======================================"
echo "📧 Gmail Email 測試工具"
echo "======================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查環境變數
check_env() {
    if [ -f .env.local ]; then
        echo -e "${GREEN}✓${NC} 找到 .env.local 檔案"

        # 檢查 Gmail 設定
        if grep -q "GMAIL_USER=" .env.local && grep -q "GMAIL_APP_PASSWORD=" .env.local; then
            GMAIL_USER=$(grep "GMAIL_USER=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d ' ')
            if [ "$GMAIL_USER" != "your-email@gmail.com" ] && [ ! -z "$GMAIL_USER" ]; then
                echo -e "${GREEN}✓${NC} Gmail 使用者已設定: ${GMAIL_USER:0:3}***@gmail.com"
            else
                echo -e "${RED}✗${NC} 請在 .env.local 中設定 GMAIL_USER"
                exit 1
            fi

            GMAIL_PASS=$(grep "GMAIL_APP_PASSWORD=" .env.local | cut -d '=' -f2 | tr -d '"' | tr -d ' ')
            if [ "$GMAIL_PASS" != "xxxx-xxxx-xxxx-xxxx" ] && [ ! -z "$GMAIL_PASS" ]; then
                echo -e "${GREEN}✓${NC} Gmail 應用程式密碼已設定"
            else
                echo -e "${RED}✗${NC} 請在 .env.local 中設定 GMAIL_APP_PASSWORD"
                echo ""
                echo "設定步驟："
                echo "1. 前往 https://myaccount.google.com/"
                echo "2. 啟用兩步驟驗證"
                echo "3. 前往 https://myaccount.google.com/apppasswords"
                echo "4. 產生應用程式密碼"
                echo "5. 將密碼貼到 .env.local 的 GMAIL_APP_PASSWORD（不含空格）"
                exit 1
            fi
        else
            echo -e "${RED}✗${NC} Gmail 設定未找到"
            echo ""
            echo "請在 .env.local 中加入："
            echo "GMAIL_USER=your-email@gmail.com"
            echo "GMAIL_APP_PASSWORD=your-app-password"
            exit 1
        fi
    else
        echo -e "${RED}✗${NC} .env.local 檔案不存在"
        echo "請複製 .env.local.example 為 .env.local 並設定"
        exit 1
    fi
}

# 測試連線
test_connection() {
    echo ""
    echo "測試 Email 連線..."

    # 確保伺服器正在運行
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠${NC}  Next.js 伺服器未運行"
        echo "正在啟動伺服器..."
        npm run dev &
        SERVER_PID=$!
        echo "等待伺服器啟動..."
        sleep 5
    fi

    # 測試 API
    RESPONSE=$(curl -s http://localhost:3000/api/test-email)

    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC} Email 連線測試成功！"
        echo ""
        echo "回應內容："
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    else
        echo -e "${RED}✗${NC} Email 連線測試失敗"
        echo ""
        echo "錯誤訊息："
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
        exit 1
    fi
}

# 發送測試郵件
send_test_email() {
    echo ""
    echo "======================================"
    echo "發送測試 Email"
    echo "======================================"
    echo ""

    read -p "請輸入收件人 Email: " RECIPIENT_EMAIL

    if [ -z "$RECIPIENT_EMAIL" ]; then
        echo -e "${RED}✗${NC} 收件人 Email 不能為空"
        exit 1
    fi

    echo ""
    echo "選擇語言："
    echo "1) 繁體中文 (zh)"
    echo "2) English (en)"
    read -p "請選擇 [1/2]: " LANG_CHOICE

    case $LANG_CHOICE in
        1)
            LOCALE="zh"
            ;;
        2)
            LOCALE="en"
            ;;
        *)
            LOCALE="zh"
            ;;
    esac

    echo ""
    echo "發送測試郵件到: $RECIPIENT_EMAIL (語言: $LOCALE)"

    # 發送測試郵件
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/test-email \
        -H "Content-Type: application/json" \
        -d "{\"to\": \"$RECIPIENT_EMAIL\", \"locale\": \"$LOCALE\"}")

    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo -e "${GREEN}✓${NC} 測試郵件發送成功！"
        echo ""
        echo "請檢查您的收件箱（包括垃圾郵件資料夾）"
        echo ""
        echo "回應內容："
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
    else
        echo -e "${RED}✗${NC} 測試郵件發送失敗"
        echo ""
        echo "錯誤訊息："
        echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
        echo ""
        echo "可能的原因："
        echo "1. 應用程式密碼錯誤"
        echo "2. 兩步驟驗證未啟用"
        echo "3. Gmail 帳號問題"
        exit 1
    fi
}

# 主程式
main() {
    echo "1. 檢查環境設定..."
    check_env

    echo ""
    echo "2. 測試 Email 連線..."
    test_connection

    echo ""
    read -p "是否要發送測試郵件？[y/N]: " SEND_TEST

    if [ "$SEND_TEST" = "y" ] || [ "$SEND_TEST" = "Y" ]; then
        send_test_email
    fi

    echo ""
    echo "======================================"
    echo -e "${GREEN}✓${NC} 測試完成！"
    echo "======================================"

    # 清理
    if [ ! -z "$SERVER_PID" ]; then
        echo ""
        echo "停止測試伺服器..."
        kill $SERVER_PID 2>/dev/null
    fi
}

# 執行主程式
main