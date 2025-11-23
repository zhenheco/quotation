#!/usr/bin/env node
/**
 * Migration 執行腳本
 * 使用方式: npm run migrate
 */

// 手動載入環境變數
import { readFileSync } from 'fs';
import { join } from 'path';

// 讀取 .env.local
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // 移除引號
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
} catch (error) {
  console.warn('⚠️  無法讀取 .env.local，使用現有環境變數');
}

import { Pool } from 'pg';
import { readdirSync } from 'fs';

// 使用 Direct URL（支援 DDL migrations）
const connectionString = process.env.SUPABASE_DB_URL;

console.log('🔗 連接資料庫...');
console.log(`   使用: Direct URL`);

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 開始執行所有 migrations...\n');

    // 獲取所有 migration 檔案（按順序）
    const migrationFiles = readdirSync(join(process.cwd(), 'migrations'))
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📄 找到 ${migrationFiles.length} 個 migration 檔案\n`);

    for (const file of migrationFiles) {
      const migrationPath = join(process.cwd(), 'migrations', file);
      console.log(`⚙️  執行: ${file}`);

      const sql = readFileSync(migrationPath, 'utf-8');

      try {
        await client.query(sql);
        console.log(`   ✅ ${file} 完成`);
      } catch (err) {
        console.error(`   ❌ ${file} 失敗:`, err);
        throw err;
      }
    }

    console.log('\n✅ 所有 migrations 執行成功！');
    console.log(`\n📊 已執行 ${migrationFiles.length} 個 migration 檔案`);

  } catch (error) {
    console.error('\n❌ Migration 執行失敗：');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
