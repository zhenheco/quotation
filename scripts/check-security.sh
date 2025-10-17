#!/bin/bash

# 環境變數安全檢查腳本
# 檢查是否有敏感資訊可能被上傳到 Git

echo "======================================"
echo "🔒 環境變數安全檢查"
echo "======================================"
echo ""

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 計數器
WARNINGS=0
ERRORS=0

# 檢查 .gitignore
check_gitignore() {
    echo "1. 檢查 .gitignore 設定..."

    if [ -f .gitignore ]; then
        if grep -q "\.env\*" .gitignore || grep -q "\.env\.local" .gitignore; then
            echo -e "${GREEN}✓${NC} .gitignore 已設定忽略 .env 檔案"
        else
            echo -e "${RED}✗${NC} .gitignore 未設定忽略 .env 檔案！"
            echo "  請在 .gitignore 加入："
            echo "  .env*"
            ((ERRORS++))
        fi
    else
        echo -e "${RED}✗${NC} .gitignore 檔案不存在！"
        ((ERRORS++))
    fi
    echo ""
}

# 檢查 .env.local 是否被忽略
check_env_ignored() {
    echo "2. 檢查 .env.local 是否被 Git 忽略..."

    if [ -f .env.local ]; then
        if git check-ignore .env.local > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} .env.local 已被 Git 忽略"
        else
            echo -e "${RED}✗${NC} .env.local 未被 Git 忽略！危險！"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}⚠${NC}  .env.local 檔案不存在"
        ((WARNINGS++))
    fi
    echo ""
}

# 檢查是否有 .env 檔案被追蹤
check_tracked_env() {
    echo "3. 檢查是否有 .env 檔案被 Git 追蹤..."

    TRACKED_ENV=$(git ls-files | grep -E "\.env" | grep -v "\.example")

    if [ -z "$TRACKED_ENV" ]; then
        echo -e "${GREEN}✓${NC} 沒有 .env 檔案被 Git 追蹤"
    else
        echo -e "${RED}✗${NC} 發現被追蹤的 .env 檔案："
        echo "$TRACKED_ENV"
        echo ""
        echo "  請立即執行："
        echo "  git rm --cached $TRACKED_ENV"
        ((ERRORS++))
    fi
    echo ""
}

# 檢查 Git 歷史
check_git_history() {
    echo "4. 檢查 Git 歷史中的 .env 檔案..."

    HISTORY_CHECK=$(git log --all --full-history -- "*.env" "*.env.local" 2>/dev/null | head -1)

    if [ -z "$HISTORY_CHECK" ]; then
        echo -e "${GREEN}✓${NC} Git 歷史中沒有找到 .env 檔案"
    else
        echo -e "${YELLOW}⚠${NC}  Git 歷史中可能有 .env 檔案"
        echo "  如果包含敏感資訊，請參考 docs/ENV_SECURITY_GUIDE.md 清理歷史"
        ((WARNINGS++))
    fi
    echo ""
}

# 檢查 .env.local 內容
check_env_content() {
    echo "5. 檢查 .env.local 內容..."

    if [ -f .env.local ]; then
        # 檢查是否有真實的敏感資訊模式
        SUSPICIOUS=0

        # 檢查 Gmail 密碼格式（16位）
        if grep -E "GMAIL_APP_PASSWORD=[a-z]{16}" .env.local > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠${NC}  發現可能的 Gmail 應用程式密碼"
            ((SUSPICIOUS++))
        fi

        # 檢查資料庫 URL
        if grep -E "postgresql://[^:]+:[^@]+@[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+" .env.local > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠${NC}  發現可能的資料庫連線字串"
            ((SUSPICIOUS++))
        fi

        # 檢查 API Keys（長字串）
        if grep -E "_KEY=[a-zA-Z0-9]{20,}" .env.local > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠${NC}  發現可能的 API 金鑰"
            ((SUSPICIOUS++))
        fi

        if [ $SUSPICIOUS -eq 0 ]; then
            echo -e "${GREEN}✓${NC} .env.local 看起來安全"
        else
            echo ""
            echo -e "${YELLOW}  請確保這些是測試資料，不是生產環境的真實密鑰${NC}"
            ((WARNINGS++))
        fi
    fi
    echo ""
}

# 檢查範例檔案
check_example_file() {
    echo "6. 檢查 .env.local.example..."

    if [ -f .env.local.example ]; then
        # 檢查是否包含真實密碼
        if grep -E "(password|key|secret)=[a-zA-Z0-9]{10,}" .env.local.example | grep -v "your-\|xxxx\|example" > /dev/null 2>&1; then
            echo -e "${RED}✗${NC} .env.local.example 可能包含真實密碼！"
            echo "  範例檔案應該只包含佔位符，如："
            echo "  GMAIL_APP_PASSWORD=your-app-password"
            ((ERRORS++))
        else
            echo -e "${GREEN}✓${NC} .env.local.example 只包含佔位符"
        fi
    else
        echo -e "${YELLOW}⚠${NC}  .env.local.example 不存在"
        echo "  建議創建範例檔案供團隊參考"
        ((WARNINGS++))
    fi
    echo ""
}

# 提供建議
provide_recommendations() {
    echo "======================================"
    echo "📋 安全建議"
    echo "======================================"

    if [ $ERRORS -gt 0 ]; then
        echo -e "${RED}發現 $ERRORS 個嚴重問題需要立即修復！${NC}"
        echo ""
        echo "立即行動："
        echo "1. 確保 .env.local 被加入 .gitignore"
        echo "2. 移除所有被追蹤的 .env 檔案"
        echo "3. 更換所有可能洩露的密碼"
        echo ""
    fi

    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}發現 $WARNINGS 個警告需要注意${NC}"
        echo ""
    fi

    if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✅ 太好了！沒有發現安全問題${NC}"
        echo ""
    fi

    echo "最佳實踐："
    echo "• 永遠不要提交包含真實密碼的檔案"
    echo "• 使用 .env.local.example 作為範例"
    echo "• 定期更換密碼和 API 金鑰"
    echo "• 在生產環境使用環境變數服務（Vercel、Heroku 等）"
    echo ""
    echo "詳細指南：docs/ENV_SECURITY_GUIDE.md"
}

# 主程式
main() {
    check_gitignore
    check_env_ignored
    check_tracked_env
    check_git_history
    check_env_content
    check_example_file
    provide_recommendations

    echo "======================================"
    if [ $ERRORS -gt 0 ]; then
        echo -e "${RED}⚠️  檢查完成 - 發現安全問題！${NC}"
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}✓ 檢查完成 - 請注意警告${NC}"
        exit 0
    else
        echo -e "${GREEN}✅ 檢查完成 - 一切安全！${NC}"
        exit 0
    fi
}

# 執行主程式
main