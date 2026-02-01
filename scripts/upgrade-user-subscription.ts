#!/usr/bin/env tsx
/**
 * 升級用戶訂閱腳本
 *
 * 用法: pnpm tsx scripts/upgrade-user-subscription.ts <email> <tier> <years>
 * 範例: pnpm tsx scripts/upgrade-user-subscription.ts adam5392000@gmail.com PROFESSIONAL 5
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'

// 手動載入 .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const envContent = readFileSync(envPath, 'utf-8')

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        let value = match[2].trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    }
  })
} catch {
  console.log('⚠️  無法載入 .env.local')
}

// 顏色輸出
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
}

type SubscriptionTier = 'FREE' | 'STARTER' | 'STANDARD' | 'PROFESSIONAL'

async function upgradeUserSubscription(
  email: string,
  tier: SubscriptionTier,
  years: number
) {
  console.log(colors.bold('\n🚀 升級用戶訂閱'))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`執行時間: ${new Date().toLocaleString('zh-TW')}`)
  console.log(`目標用戶: ${email}`)
  console.log(`目標方案: ${tier}`)
  console.log(`有效期限: ${years} 年\n`)

  // 檢查環境變數
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(colors.red('❌ 錯誤: 缺少 Supabase 環境變數'))
    console.error('需要: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Step 1: 查找用戶
  console.log(colors.blue('📧 Step 1: 查找用戶...'))
  const { data: authUser, error: authError } = await supabase
    .from('user_profiles')
    .select('id, user_id, display_name, email')
    .eq('email', email)
    .single()

  if (authError || !authUser) {
    // 嘗試從 auth.users 查找
    const { data: authData, error: authDataError } =
      await supabase.auth.admin.listUsers()

    if (authDataError) {
      console.error(colors.red(`❌ 無法查詢 auth users: ${authDataError.message}`))
      process.exit(1)
    }

    const user = authData.users.find((u) => u.email === email)
    if (!user) {
      console.error(colors.red(`❌ 找不到用戶: ${email}`))
      process.exit(1)
    }

    console.log(colors.green(`✅ 從 auth.users 找到用戶: ${user.id}`))

    // 查找 user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id, display_name, email')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error(colors.red(`❌ 找不到用戶 profile: ${profileError?.message}`))
      process.exit(1)
    }

    console.log(colors.green(`✅ 找到用戶 profile: ${profile.display_name || profile.email}`))

    // 繼續查找公司
    await findAndUpgrade(supabase, profile.user_id, tier, years)
    return
  }

  console.log(colors.green(`✅ 找到用戶: ${authUser.display_name || authUser.email}`))
  await findAndUpgrade(supabase, authUser.user_id, tier, years)
}

async function findAndUpgrade(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  tier: SubscriptionTier,
  years: number
) {
  // Step 2: 查找用戶所屬的公司
  console.log(colors.blue('\n🏢 Step 2: 查找用戶所屬公司...'))
  const { data: companyMembers, error: memberError } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', userId)

  if (memberError || !companyMembers || companyMembers.length === 0) {
    console.error(colors.red(`❌ 找不到用戶所屬公司: ${memberError?.message}`))
    process.exit(1)
  }

  // 取第一個公司（通常用戶只屬於一個公司）
  const companyId = companyMembers[0].company_id

  // 查詢公司名稱
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', companyId)
    .single()

  // name 是 JSONB 格式 {"zh": "...", "en": "..."}
  let companyName = companyId
  if (company?.name) {
    const nameObj = company.name as { zh?: string; en?: string }
    companyName = nameObj.zh || nameObj.en || companyId
  }
  console.log(colors.green(`✅ 找到公司: ${companyName} (${companyId})`))

  // Step 3: 查找 PROFESSIONAL 方案
  console.log(colors.blue('\n📋 Step 3: 查找訂閱方案...'))
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('tier', tier)
    .single()

  if (planError || !plan) {
    console.error(colors.red(`❌ 找不到 ${tier} 方案: ${planError?.message}`))
    process.exit(1)
  }

  console.log(colors.green(`✅ 找到方案: ${plan.name} (${plan.tier})`))
  console.log(`   月費: ${plan.monthly_price} ${plan.currency}`)
  console.log(`   年費: ${plan.yearly_price} ${plan.currency}`)

  // Step 4: 計算有效期限（從現在開始 N 年）
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setFullYear(periodEnd.getFullYear() + years)

  console.log(colors.blue('\n📅 Step 4: 設定有效期限...'))
  console.log(`   開始: ${now.toLocaleString('zh-TW')}`)
  console.log(`   結束: ${periodEnd.toLocaleString('zh-TW')}`)

  // Step 5: 更新或建立訂閱
  console.log(colors.blue('\n💳 Step 5: 更新訂閱記錄...'))

  // 先查看是否有現有訂閱
  const { data: existingSub, error: existingError } = await supabase
    .from('company_subscriptions')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error(colors.red(`❌ 查詢現有訂閱失敗: ${existingError.message}`))
    process.exit(1)
  }

  const subscriptionData = {
    company_id: companyId,
    plan_id: plan.id,
    status: 'ACTIVE' as const,
    billing_cycle: 'YEARLY' as const,
    started_at: now.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    last_payment_at: now.toISOString(),
    next_payment_at: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  }

  if (existingSub) {
    console.log(colors.yellow(`   現有方案: ${existingSub.status}`))

    // 更新現有訂閱
    const { data: updated, error: updateError } = await supabase
      .from('company_subscriptions')
      .update(subscriptionData)
      .eq('id', existingSub.id)
      .select('*')
      .single()

    if (updateError) {
      console.error(colors.red(`❌ 更新訂閱失敗: ${updateError.message}`))
      process.exit(1)
    }

    console.log(colors.green(`✅ 訂閱已更新!`))

    // 記錄變更歷史
    await supabase.from('subscription_history').insert({
      subscription_id: existingSub.id,
      previous_plan_id: existingSub.plan_id,
      new_plan_id: plan.id,
      previous_status: existingSub.status,
      new_status: 'ACTIVE',
      change_type: 'UPGRADE',
      change_reason: `管理員手動升級至 ${tier} ${years} 年`,
      created_at: now.toISOString(),
    })
  } else {
    // 建立新訂閱
    const { data: created, error: createError } = await supabase
      .from('company_subscriptions')
      .insert({
        ...subscriptionData,
        created_at: now.toISOString(),
      })
      .select('*')
      .single()

    if (createError) {
      console.error(colors.red(`❌ 建立訂閱失敗: ${createError.message}`))
      process.exit(1)
    }

    console.log(colors.green(`✅ 訂閱已建立!`))
  }

  // 完成
  console.log(colors.cyan('\n' + '='.repeat(60)))
  console.log(colors.bold(colors.green('🎉 升級完成!')))
  console.log(colors.cyan('='.repeat(60)))
  console.log(`用戶: ${userId}`)
  console.log(`公司: ${companyName}`)
  console.log(`方案: ${plan.name} (${tier})`)
  console.log(`有效期限: ${periodEnd.toLocaleDateString('zh-TW')}`)
  console.log('')
}

// 執行
const args = process.argv.slice(2)
if (args.length < 3) {
  console.log('用法: pnpm tsx scripts/upgrade-user-subscription.ts <email> <tier> <years>')
  console.log('範例: pnpm tsx scripts/upgrade-user-subscription.ts adam5392000@gmail.com PROFESSIONAL 5')
  console.log('\n可用方案: FREE, STARTER, STANDARD, PROFESSIONAL')
  process.exit(1)
}

const [email, tier, yearsStr] = args
const years = parseInt(yearsStr, 10)

if (!['FREE', 'STARTER', 'STANDARD', 'PROFESSIONAL'].includes(tier)) {
  console.error(colors.red(`❌ 無效的方案: ${tier}`))
  console.error('可用方案: FREE, STARTER, STANDARD, PROFESSIONAL')
  process.exit(1)
}

if (isNaN(years) || years < 1) {
  console.error(colors.red(`❌ 無效的年份: ${yearsStr}`))
  process.exit(1)
}

upgradeUserSubscription(email, tier as SubscriptionTier, years).catch((error) => {
  console.error(colors.red('\n❌ 腳本執行失敗:'), error)
  process.exit(1)
})
