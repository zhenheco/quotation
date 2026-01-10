#!/usr/bin/env npx tsx
/**
 * 升級公司訂閱到 PROFESSIONAL 方案
 * 使用方式: npx tsx scripts/upgrade-company-subscription.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// 載入環境變數
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
} catch {
  console.warn('⚠️  無法讀取 .env.local')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function upgradeCompany() {
  console.log('🚀 開始升級公司訂閱到 PROFESSIONAL 方案...\n')

  try {
    // 1. 取得 PROFESSIONAL 方案 ID
    const { data: proPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, tier, name')
      .eq('tier', 'PROFESSIONAL')
      .single()

    if (planError || !proPlan) {
      console.error('❌ 找不到 PROFESSIONAL 方案:', planError?.message)
      process.exit(1)
    }
    console.log(`✅ 找到方案: ${proPlan.name} (${proPlan.tier})`)

    // 2. 取得公司資訊 (直接使用已知的 company_id)
    const companyId = '521adbfe-cb2b-411a-a722-b42814ce513b'
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, tax_id')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      console.error('❌ 找不到公司:', companyError?.message)
      process.exit(1)
    }
    console.log(`✅ 找到公司: ${company.name} (統編: ${company.tax_id})`)

    // 3. 檢查現有訂閱
    const { data: existingSub } = await supabase
      .from('company_subscriptions')
      .select('id, plan_id, status')
      .eq('company_id', company.id)
      .single()

    if (existingSub) {
      // 更新現有訂閱
      const { error: updateError } = await supabase
        .from('company_subscriptions')
        .update({
          plan_id: proPlan.id,
          status: 'ACTIVE',
          current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSub.id)

      if (updateError) {
        console.error('❌ 更新訂閱失敗:', updateError.message)
        process.exit(1)
      }
      console.log('✅ 訂閱已更新!')
    } else {
      // 建立新訂閱
      const { error: insertError } = await supabase
        .from('company_subscriptions')
        .insert({
          company_id: company.id,
          plan_id: proPlan.id,
          status: 'ACTIVE',
          billing_cycle: 'YEARLY',
          current_period_end: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
        })

      if (insertError) {
        console.error('❌ 建立訂閱失敗:', insertError.message)
        process.exit(1)
      }
      console.log('✅ 訂閱已建立!')
    }

    // 4. 驗證結果
    const { data: finalSub } = await supabase
      .from('company_subscriptions')
      .select(`
        id,
        status,
        current_period_end,
        subscription_plans (
          tier,
          name
        )
      `)
      .eq('company_id', company.id)
      .single()

    console.log('\n📊 升級結果:')
    console.log(`   公司: ${company.name}`)
    console.log(`   方案: ${(finalSub?.subscription_plans as { name: string })?.name}`)
    console.log(`   狀態: ${finalSub?.status}`)
    console.log(`   到期日: ${finalSub?.current_period_end}`)

    console.log('\n🎉 升級完成！現在可以使用所有功能，包括營所稅擴大書審。')

  } catch (error) {
    console.error('❌ 執行過程中發生錯誤:', error)
    process.exit(1)
  }
}

upgradeCompany()
