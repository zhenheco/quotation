#!/bin/bash
# Cloudflare Secrets 批次設定腳本
# 用法：./scripts/setup-cloudflare-secrets.sh

PROJECT_NAME="quotation-system"

echo "========================================="
echo "Cloudflare Secrets 設定工具"
echo "========================================="
echo ""
echo "此腳本將協助您設定所有必要的環境變數到 Cloudflare Workers"
echo ""

# 必要的 secrets
declare -a REQUIRED_SECRETS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_POOLER_URL"
  "EXCHANGE_RATE_API_KEY"
  "COMPANY_NAME"
  "NEXT_PUBLIC_APP_URL"
  "CSRF_SECRET"
  "CRON_SECRET"
)

# 可選的 secrets（Email 服務）
declare -a OPTIONAL_EMAIL_SECRETS=(
  "GMAIL_USER"
  "GMAIL_APP_PASSWORD"
  "RESEND_API_KEY"
  "EMAIL_FROM"
)

# 可選的 secrets（監控通知）
declare -a OPTIONAL_WEBHOOK_SECRETS=(
  "ERROR_WEBHOOK_URL"
  "SUCCESS_WEBHOOK_URL"
  "SLACK_WEBHOOK_URL"
)

echo "第一步：設定必要的環境變數"
echo "-------------------------------------------"

for secret in "${REQUIRED_SECRETS[@]}"; do
  echo ""
  echo "設定: $secret"

  # 特別說明
  case $secret in
    "SUPABASE_POOLER_URL")
      echo "提示：Supabase Pooler URL 格式範例："
      echo "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
      ;;
    "CSRF_SECRET")
      echo "提示：產生隨機 32 字元字串（可執行: openssl rand -base64 32）"
      ;;
    "CRON_SECRET")
      echo "提示：產生隨機字串用於手動觸發 cron jobs"
      ;;
    "NEXT_PUBLIC_APP_URL")
      echo "提示：生產環境 URL，例如：https://quotation-system.pages.dev"
      ;;
  esac

  read -sp "請輸入 $secret 的值（輸入將被隱藏）: " value
  echo ""

  if [ -z "$value" ]; then
    echo "❌ 值不能為空，跳過此 secret"
    continue
  fi

  echo "$value" | pnpm exec wrangler secret put "$secret" --name "$PROJECT_NAME"

  if [ $? -eq 0 ]; then
    echo "✅ $secret 設定成功"
  else
    echo "❌ $secret 設定失敗"
  fi
done

echo ""
echo "第二步：Email 服務設定（可選）"
echo "-------------------------------------------"
read -p "是否設定 Email 服務？(y/n): " setup_email

if [ "$setup_email" = "y" ] || [ "$setup_email" = "Y" ]; then
  echo ""
  echo "選擇 Email 服務："
  echo "1. Gmail SMTP（推薦用於測試）"
  echo "2. Resend API（推薦用於生產）"
  echo "3. 兩者都設定"
  read -p "請選擇 (1/2/3): " email_choice

  case $email_choice in
    1)
      for secret in "GMAIL_USER" "GMAIL_APP_PASSWORD"; do
        echo ""
        echo "設定: $secret"
        read -sp "請輸入 $secret 的值: " value
        echo ""
        if [ -n "$value" ]; then
          echo "$value" | pnpm exec wrangler secret put "$secret" --name "$PROJECT_NAME"
        fi
      done
      ;;
    2)
      for secret in "RESEND_API_KEY" "EMAIL_FROM"; do
        echo ""
        echo "設定: $secret"
        read -sp "請輸入 $secret 的值: " value
        echo ""
        if [ -n "$value" ]; then
          echo "$value" | pnpm exec wrangler secret put "$secret" --name "$PROJECT_NAME"
        fi
      done
      ;;
    3)
      for secret in "${OPTIONAL_EMAIL_SECRETS[@]}"; do
        echo ""
        echo "設定: $secret"
        read -sp "請輸入 $secret 的值: " value
        echo ""
        if [ -n "$value" ]; then
          echo "$value" | pnpm exec wrangler secret put "$secret" --name "$PROJECT_NAME"
        fi
      done
      ;;
  esac
fi

echo ""
echo "第三步：監控通知設定（可選）"
echo "-------------------------------------------"
read -p "是否設定監控通知（Slack/Webhook）？(y/n): " setup_webhook

if [ "$setup_webhook" = "y" ] || [ "$setup_webhook" = "Y" ]; then
  for secret in "${OPTIONAL_WEBHOOK_SECRETS[@]}"; do
    echo ""
    echo "設定: $secret"
    read -sp "請輸入 $secret 的值（留空則跳過）: " value
    echo ""
    if [ -n "$value" ]; then
      echo "$value" | pnpm exec wrangler secret put "$secret" --name "$PROJECT_NAME"
    fi
  done
fi

echo ""
echo "========================================="
echo "設定完成！"
echo "========================================="
echo ""
echo "檢視已設定的 secrets："
echo "pnpm exec wrangler secret list --name $PROJECT_NAME"
echo ""
