#!/usr/bin/env tsx

/**
 * 執行報價單 RLS 策略修復
 * 用途: 為 quotation_versions 和 quotation_shares 表新增缺失的 RLS 策略
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// 載入環境變數
dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 錯誤: 缺少必要的環境變數')
  console.error('請確認 .env 檔案包含:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 使用 Service Role Key 建立客戶端（繞過 RLS）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * 執行單一 SQL 語句
 */
async function executeSql(sql: string, description: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error(`❌ ${description} 失敗:`, error.message)
      return false
    }

    console.log(`✅ ${description} 成功`)
    return true
  } catch (err: any) {
    console.error(`❌ ${description} 發生異常:`, err.message)
    return false
  }
}

/**
 * 主要執行流程
 */
async function main() {
  console.log('============================================================')
  console.log('🔧 開始修復報價單 RLS 策略')
  console.log('============================================================\n')

  let successCount = 0
  let totalCount = 0

  // ============================================================
  // 1. quotation_versions 表的 RLS 策略
  // ============================================================
  console.log('📋 設定 quotation_versions 表的 RLS 策略...\n')

  // 1.1 SELECT 策略
  totalCount++
  const versionSelect = `
    DROP POLICY IF EXISTS "Users can view their quotation versions" ON quotation_versions;
    CREATE POLICY "Users can view their quotation versions"
      ON quotation_versions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = quotation_versions.quotation_id
          AND quotations.user_id = auth.uid()
        )
      );
  `
  if (await executeSql(versionSelect, '建立 quotation_versions SELECT 策略')) successCount++

  // 1.2 INSERT 策略
  totalCount++
  const versionInsert = `
    DROP POLICY IF EXISTS "Users can insert their quotation versions" ON quotation_versions;
    CREATE POLICY "Users can insert their quotation versions"
      ON quotation_versions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = quotation_versions.quotation_id
          AND quotations.user_id = auth.uid()
        )
      );
  `
  if (await executeSql(versionInsert, '建立 quotation_versions INSERT 策略')) successCount++

  // 1.3 UPDATE 策略
  totalCount++
  const versionUpdate = `
    DROP POLICY IF EXISTS "Users can update their quotation versions" ON quotation_versions;
    CREATE POLICY "Users can update their quotation versions"
      ON quotation_versions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = quotation_versions.quotation_id
          AND quotations.user_id = auth.uid()
        )
      );
  `
  if (await executeSql(versionUpdate, '建立 quotation_versions UPDATE 策略')) successCount++

  // 1.4 DELETE 策略
  totalCount++
  const versionDelete = `
    DROP POLICY IF EXISTS "Users can delete their quotation versions" ON quotation_versions;
    CREATE POLICY "Users can delete their quotation versions"
      ON quotation_versions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = quotation_versions.quotation_id
          AND quotations.user_id = auth.uid()
        )
      );
  `
  if (await executeSql(versionDelete, '建立 quotation_versions DELETE 策略')) successCount++

  // ============================================================
  // 2. quotation_shares 表的 RLS 策略
  // ============================================================
  console.log('\n📋 設定 quotation_shares 表的 RLS 策略...\n')

  // 2.1 SELECT 策略
  totalCount++
  const shareSelect = `
    DROP POLICY IF EXISTS "Users can view their quotation shares" ON quotation_shares;
    CREATE POLICY "Users can view their quotation shares"
      ON quotation_shares
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = quotation_shares.quotation_id
          AND quotations.user_id = auth.uid()
        )
      );
  `
  if (await executeSql(shareSelect, '建立 quotation_shares SELECT 策略')) successCount++

  // 2.2 INSERT 策略
  totalCount++
  const shareInsert = `
    DROP POLICY IF EXISTS "Users can insert their quotation shares" ON quotation_shares;
    CREATE POLICY "Users can insert their quotation shares"
      ON quotation_shares
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = quotation_shares.quotation_id
          AND quotations.user_id = auth.uid()
        )
      );
  `
  if (await executeSql(shareInsert, '建立 quotation_shares INSERT 策略')) successCount++

  // 2.3 UPDATE 策略
  totalCount++
  const shareUpdate = `
    DROP POLICY IF EXISTS "Users can update their quotation shares" ON quotation_shares;
    CREATE POLICY "Users can update their quotation shares"
      ON quotation_shares
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = quotation_shares.quotation_id
          AND quotations.user_id = auth.uid()
        )
      );
  `
  if (await executeSql(shareUpdate, '建立 quotation_shares UPDATE 策略')) successCount++

  // 2.4 DELETE 策略
  totalCount++
  const shareDelete = `
    DROP POLICY IF EXISTS "Users can delete their quotation shares" ON quotation_shares;
    CREATE POLICY "Users can delete their quotation shares"
      ON quotation_shares
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM quotations
          WHERE quotations.id = quotation_shares.quotation_id
          AND quotations.user_id = auth.uid()
        )
      );
  `
  if (await executeSql(shareDelete, '建立 quotation_shares DELETE 策略')) successCount++

  // ============================================================
  // 總結
  // ============================================================
  console.log('\n============================================================')
  console.log('📊 修復結果總結')
  console.log('============================================================')
  console.log(`總策略數: ${totalCount}`)
  console.log(`成功: ${successCount}`)
  console.log(`失敗: ${totalCount - successCount}`)
  console.log(`成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`)
  console.log('============================================================')

  if (successCount === totalCount) {
    console.log('✅ 所有 RLS 策略已成功建立！')
    console.log('\n下一步:')
    console.log('  執行: npx tsx scripts/test-quotation-system.ts')
    console.log('  預期結果: 9/9 測試通過 (100%)')
  } else {
    console.log('⚠️  部分策略建立失敗，請檢查錯誤訊息')
    console.log('\n可能的解決方案:')
    console.log('  1. 在 Supabase Dashboard 的 SQL Editor 中手動執行 scripts/FIX_QUOTATION_RLS_POLICIES.sql')
    console.log('  2. 檢查資料庫權限設定')
  }
}

main().catch(console.error)
