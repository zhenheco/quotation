#!/usr/bin/env tsx
/**
 * 自動修復 RLS 策略
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 手動載入 .env.local
const envPath = resolve(__dirname, '../.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

async function fixRLS() {
  console.log('🔧 開始修復 RLS 策略\n')

  const fixes = [
    // Customers
    {
      table: 'customers',
      policies: [
        {
          name: 'Users can view their own customers',
          sql: `
            CREATE POLICY "Users can view their own customers"
            ON customers FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
          `
        },
        {
          name: 'Users can insert their own customers',
          sql: `
            CREATE POLICY "Users can insert their own customers"
            ON customers FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
          `
        },
        {
          name: 'Users can update their own customers',
          sql: `
            CREATE POLICY "Users can update their own customers"
            ON customers FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
          `
        },
        {
          name: 'Users can delete their own customers',
          sql: `
            CREATE POLICY "Users can delete their own customers"
            ON customers FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
          `
        }
      ]
    },
    // Products
    {
      table: 'products',
      policies: [
        {
          name: 'Users can view their own products',
          sql: `
            CREATE POLICY "Users can view their own products"
            ON products FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
          `
        },
        {
          name: 'Users can insert their own products',
          sql: `
            CREATE POLICY "Users can insert their own products"
            ON products FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
          `
        },
        {
          name: 'Users can update their own products',
          sql: `
            CREATE POLICY "Users can update their own products"
            ON products FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
          `
        },
        {
          name: 'Users can delete their own products',
          sql: `
            CREATE POLICY "Users can delete their own products"
            ON products FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
          `
        }
      ]
    }
  ]

  for (const fix of fixes) {
    console.log(`📋 修復 ${fix.table} 表的策略...`)

    // 先刪除舊策略
    for (const policy of fix.policies) {
      const dropSql = `DROP POLICY IF EXISTS "${policy.name}" ON ${fix.table};`
      const { error: dropError } = await supabaseAdmin.rpc('exec_sql', { sql: dropSql })
      if (dropError && !dropError.message.includes('does not exist')) {
        console.log(`  ⚠️  刪除策略失敗: ${policy.name}`)
      }
    }

    // 建立新策略
    for (const policy of fix.policies) {
      const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: policy.sql })
      if (createError) {
        console.log(`  ❌ 建立策略失敗: ${policy.name}`)
        console.log(`     錯誤: ${createError.message}`)
      } else {
        console.log(`  ✅ ${policy.name}`)
      }
    }

    console.log()
  }

  console.log('🎉 RLS 策略修復完成！\n')
}

fixRLS().catch(err => {
  console.error('❌ 修復過程發生錯誤:', err.message)
  console.log('\n💡 請手動在 Supabase Dashboard > SQL Editor 執行:')
  console.log('   scripts/FIX_RLS_POLICIES.sql\n')
})
