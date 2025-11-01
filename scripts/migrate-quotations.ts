#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { getZeaburPool } from '../lib/db/zeabur'

async function migrateQuotations() {
  const pool = getZeaburPool()

  try {
    console.log('🔄 開始遷移 quotations 表...')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 4) DEFAULT 1')
    console.log('✅ 已添加 exchange_rate 欄位')

    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'overdue'))`)
    console.log('✅ 已添加 payment_status 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMP')
    console.log('✅ 已添加 payment_due_date 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS total_paid NUMERIC(10, 2) DEFAULT 0')
    console.log('✅ 已添加 total_paid 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2)')
    console.log('✅ 已添加 deposit_amount 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deposit_paid_date TIMESTAMP')
    console.log('✅ 已添加 deposit_paid_date 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS final_payment_amount NUMERIC(10, 2)')
    console.log('✅ 已添加 final_payment_amount 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS final_payment_due_date TIMESTAMP')
    console.log('✅ 已添加 final_payment_due_date 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS contract_signed_date TIMESTAMP')
    console.log('✅ 已添加 contract_signed_date 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS contract_expiry_date TIMESTAMP')
    console.log('✅ 已添加 contract_expiry_date 欄位')

    await pool.query(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS payment_frequency TEXT CHECK (payment_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual'))`)
    console.log('✅ 已添加 payment_frequency 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS next_collection_date TIMESTAMP')
    console.log('✅ 已添加 next_collection_date 欄位')

    await pool.query('ALTER TABLE quotations ADD COLUMN IF NOT EXISTS next_collection_amount NUMERIC(10, 2)')
    console.log('✅ 已添加 next_collection_amount 欄位')

    console.log('✅ 遷移完成！')
  } catch (error) {
    console.error('❌ 遷移失敗:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrateQuotations()
