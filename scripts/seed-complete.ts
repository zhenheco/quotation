/**
 * 完整的測試資料建立腳本（適配實際資料庫結構）
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
  console.warn('⚠️  無法讀取 .env.local');
}

const pool = new Pool({
  connectionString: process.env.ZEABUR_POSTGRES_URL,
  ssl: false,
});

async function seedComplete() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('🌱 開始建立完整測試資料...\n');

    // 1. 建立測試用戶
    console.log('1️⃣ 建立測試用戶...');

    const result = await client.query(
      `INSERT INTO user_profiles (user_id, full_name, display_name, is_active)
       VALUES (gen_random_uuid(), '測試用戶', '測試用戶', true)
       ON CONFLICT DO NOTHING
       RETURNING user_id`
    );

    let userId: string;

    if (result.rows.length > 0) {
      userId = result.rows[0].user_id;
      console.log(`   ✅ 建立用戶 ID: ${userId}`);
    } else {
      const existing = await client.query('SELECT user_id FROM user_profiles LIMIT 1');
      userId = existing.rows[0].user_id;
      console.log(`   ℹ️  使用現有用戶 ID: ${userId}`);
    }

    // 2. 建立 5 個產品
    console.log('\n2️⃣ 建立 5 個測試產品...');
    const products = [
      { zh: 'Cloud Server 標準方案', en: 'Cloud Server Standard', price: 15000 },
      { zh: 'SSL 憑證服務', en: 'SSL Certificate', price: 3000 },
      { zh: '網站維護 (月)', en: 'Website Maintenance', price: 5000 },
      { zh: '資料庫備份服務', en: 'DB Backup Service', price: 3000 },
      { zh: '技術支援 (時)', en: 'Technical Support', price: 2000 },
    ];

    const productIds: string[] = [];
    for (const p of products) {
      const r = await client.query(
        `INSERT INTO products (user_id, name, unit_price, currency)
         VALUES ($1, $2, $3, 'TWD') RETURNING id`,
        [userId, JSON.stringify(p), p.price]
      );
      productIds.push(r.rows[0].id);
      console.log(`   ✅ ${p.zh} - NT$${p.price}`);
    }

    // 3. 建立 5 個客戶
    console.log('\n3️⃣ 建立 5 個測試客戶...');
    const customers = [
      { zh: '台北科技公司', en: 'Taipei Tech' },
      { zh: '新竹軟體開發', en: 'Hsinchu Software' },
      { zh: '台中數位行銷', en: 'Taichung Digital' },
      { zh: '高雄雲端服務', en: 'Kaohsiung Cloud' },
      { zh: '台南資訊科技', en: 'Tainan IT' },
    ];

    const customerIds: string[] = [];
    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      const r = await client.query(
        `INSERT INTO customers (user_id, name, email, phone)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, JSON.stringify(c), `test${i+1}@example.com`, `0${i+2}-1234-5678`]
      );
      customerIds.push(r.rows[0].id);
      console.log(`   ✅ ${c.zh}`);
    }

    // 4. 建立 5 個報價單
    console.log('\n4️⃣ 建立 5 個測試報價單...');
    const statuses = ['draft', 'sent', 'sent', 'accepted', 'accepted'];

    for (let i = 0; i < 5; i++) {
      const quotNum = `Q${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i + 100).padStart(3, '0')}`;

      const r = await client.query(
        `INSERT INTO quotations (
           user_id, customer_id, quotation_number, issue_date, valid_until,
           status, subtotal, tax_rate, tax_amount, total_amount, currency
         )
         VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
                 $4, 25000, 5, 1250, 26250, 'TWD')
         RETURNING id`,
        [userId, customerIds[i], quotNum, statuses[i]]
      );

      const quotId = r.rows[0].id;

      // 新增項目
      const numItems = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < numItems; j++) {
        const prodId = productIds[j % productIds.length];
        const qty = 1 + Math.floor(Math.random() * 2);

        await client.query(
          `INSERT INTO quotation_items (quotation_id, product_id, quantity, unit_price, discount, subtotal)
           SELECT $1, $2, $3, unit_price, 0, unit_price * $3
           FROM products WHERE id = $2`,
          [quotId, prodId, qty]
        );
      }

      console.log(`   ✅ ${quotNum} (${statuses[i]})`);
    }

    // 5. 建立測試角色用戶（如果 roles 表存在）
    console.log('\n5️⃣ 檢查並建立角色用戶...');
    try {
      const rolesExist = await client.query(
        `SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'roles')`
      );

      if (rolesExist.rows[0].exists) {
        const testRoles = [
          { email: 'owner@test.com', name: '老闆', role: 'company_owner' },
          { email: 'accountant@test.com', name: '會計', role: 'accountant' },
          { email: 'sales@test.com', name: '業務', role: 'salesperson' },
        ];

        for (const u of testRoles) {
          const userR = await client.query(
            `INSERT INTO user_profiles (user_id, full_name, display_name, is_active)
             VALUES (gen_random_uuid(), $1, $1, true)
             ON CONFLICT DO NOTHING
             RETURNING user_id`,
            [u.name]
          );

          if (userR.rows.length > 0) {
            const newUserId = userR.rows[0].user_id;

            // 指派角色
            const roleR = await client.query(
              `SELECT id FROM roles WHERE name = $1`,
              [u.role]
            );

            if (roleR.rows.length > 0) {
              await client.query(
                `INSERT INTO user_roles (user_id, role_id, assigned_by)
                 VALUES ($1, $2, $1)
                 ON CONFLICT DO NOTHING`,
                [newUserId, roleR.rows[0].id]
              );
              console.log(`   ✅ ${u.name} (${u.email}) - ${u.role}`);
            }
          }
        }
      } else {
        console.log('   ℹ️  roles 表不存在，跳過角色用戶建立');
      }
    } catch (err) {
      console.log('   ⚠️  角色用戶建立失敗（可忽略）:', (err as Error).message);
    }

    await client.query('COMMIT');

    console.log('\n✅ 測試資料建立完成！\n');
    console.log('📊 總結：');
    console.log('  • 1 個主要測試用戶');
    console.log('  • 5 個產品');
    console.log('  • 5 個客戶');
    console.log('  • 5 個報價單（含不同狀態）');
    console.log('  • 3 個角色用戶（如果 RBAC 系統存在）\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ 錯誤:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedComplete()
  .then(() => {
    console.log('🎉 完成！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 失敗:', err.message);
    process.exit(1);
  });
