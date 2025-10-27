#!/usr/bin/env tsx
/**
 * 檢查 customer_contracts 資料表結構
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 載入環境變數
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
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  // 登入
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'TestPassword123!',
  })

  if (!authData.user) {
    console.log('登入失敗')
    return
  }

  console.log('已登入，User ID:', authData.user.id)

  // 嘗試插入一個空記錄，看看會報哪些錯誤
  const { error } = await supabase
    .from('customer_contracts')
    .insert({})
    .select()

  if (error) {
    console.log('\n錯誤訊息:')
    console.log(error.message)
    console.log('\n錯誤詳情:')
    console.log(JSON.stringify(error, null, 2))
  }
}

checkSchema()
