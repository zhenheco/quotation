/**
 * 簡化的測試資料建立腳本
 * 適配實際的資料庫結構
 */

import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// 手動載入環境變數
try {
  const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
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

const pool = new Pool({
  connectionString: process.env.ZEABUR_POSTGRES_URL,
  ssl: false,
});

async function seedSimpleData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🌱 開始建立簡化測試資料...\n');

    // 取得第一個用戶 ID
    const userResult = await client.query(
      'SELECT user_id FROM user_profiles LIMIT 1'
    );

    if (userResult.rows.length === 0) {
      console.error('❌ 沒有找到用戶，請先執行完整的 seed-test-data.ts');
      return;
    }

    const userId = userResult.rows[0].user_id;
    console.log(`✅ 使用用戶 ID: ${userId}\n`);

    // 建立 5 個產品
    console.log('1️⃣ 建立測試產品...');
    const products = [
      {
        name_zh: 'Cloud Server 標準方案',
        name_en: 'Cloud Server Standard',
        price: 15000,
        cost: 8000,
      },
      {
        name_zh: 'SSL 憑證服務',
        name_en: 'SSL Certificate Service',
        price: 3000,
        cost: 1500,
      },
      {
        name_zh: '網站維護 (月)',
        name_en: 'Website Maintenance',
        price: 5000,
        cost: 2000,
      },
      {
        name_zh: '資料庫備份服務',
        name_en: 'Database Backup',
        price: 3000,
        cost: 1000,
      },
      {
        name_zh: '技術支援 (時)',
        name_en: 'Technical Support',
        price: 2000,
        cost: 800,
      },
    ];

    const productIds: string[] = [];

    for (const p of products) {
      const result = await client.query(
        `INSERT INTO products (user_id, name, unit_price, currency, category)
         VALUES ($1, $2, $3, 'TWD', 'Service')
         RETURNING id`,
        [
          userId,
          JSON.stringify({ zh: p.name_zh, en: p.name_en }),
          p.price,
        ]
      );
      productIds.push(result.rows[0].id);
      console.log(`   ✅ ${p.name_zh} - $${p.price}`);
    }

    // 建立 5 個客戶
    console.log('\n2️⃣ 建立測試客戶...');
    const customers = [
      '台北科技公司',
      '新竹軟體開發',
      '台中數位行銷',
      '高雄雲端服務',
      '台南資訊科技',
    ];

    const customerIds: string[] = [];

    for (let i = 0; i < customers.length; i++) {
      const result = await client.query(
        `INSERT INTO customers (user_id, name, email, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          userId,
          JSON.stringify({ zh: customers[i], en: customers[i] }),
          `contact${i + 1}@test.com`,
          `0${i + 2}-1234-5678`,
        ]
      );
      customerIds.push(result.rows[0].id);
      console.log(`   ✅ ${customers[i]}`);
    }

    // 建立 5 個報價單
    console.log('\n3️⃣ 建立測試報價單...');
    const statuses = ['draft', 'sent', 'sent', 'accepted', 'accepted'];

    for (let i = 0; i < 5; i++) {
      const quotNumber = `Q${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`;

      const result = await client.query(
        `INSERT INTO quotations (
           user_id, customer_id, quotation_number,
           issue_date, valid_until, status,
           subtotal, tax_rate, tax_amount, total_amount, currency
         )
         VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', $4,
                 50000, 5, 2500, 52500, 'TWD')
         RETURNING id`,
        [userId, customerIds[i], quotNumber, statuses[i]]
      );

      const quotId = result.rows[0].id;

      // 新增 2-3 個項目
      const numItems = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numItems; j++) {
        const prodId = productIds[Math.floor(Math.random() * productIds.length)];
        const qty = 1 + Math.floor(Math.random() * 3);

        await client.query(
          `INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, subtotal)
           SELECT $1, $2, $3, unit_price, unit_price * $3
           FROM products WHERE id = $2`,
          [quotId, prodId, qty]
        );
      }

      console.log(`   ✅ ${quotNumber} (${statuses[i]})`);
    }

    await client.query('COMMIT');

    console.log('\n✅ 測試資料建立完成！\n');
    console.log('📊 總結：');
    console.log(`  • ${products.length} 個產品`);
    console.log(`  • ${customers.length} 個客戶`);
    console.log(`  • 5 個報價單（包含各種狀態）\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 建立測試資料時發生錯誤:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedSimpleData()
  .then(() => {
    console.log('🎉 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 失敗:', error);
    process.exit(1);
  });
