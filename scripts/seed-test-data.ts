/**
 * Seed Test Data Script
 * Creates test data for development and testing
 *
 * Usage:
 *   npx tsx scripts/seed-test-data.ts
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
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seedTestData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('🌱 開始建立測試資料...\n');

    // ========================================================================
    // 1. 建立測試用戶（如果尚未存在）
    // ========================================================================
    console.log('1️⃣ 建立測試用戶...');

    const testUsers = [
      {
        email: 'super_admin@test.com',
        full_name: '系統管理員',
        role: 'super_admin',
      },
      {
        email: 'owner@test.com',
        full_name: '公司負責人',
        role: 'company_owner',
      },
      {
        email: 'manager@test.com',
        full_name: '業務主管',
        role: 'sales_manager',
      },
      {
        email: 'sales@test.com',
        full_name: '業務人員',
        role: 'sales',
      },
      {
        email: 'accountant@test.com',
        full_name: '會計',
        role: 'accountant',
      },
    ];

    const userIds: Record<string, string> = {};

    for (const user of testUsers) {
      // Check if user exists in auth.users (Supabase)
      // For testing, we'll create user_profiles directly
      // In production, users should be created through Supabase Auth

      const userResult = await client.query(
        `INSERT INTO user_profiles (user_id, full_name, display_name, is_active)
         VALUES (gen_random_uuid(), $1, $2, true)
         ON CONFLICT DO NOTHING
         RETURNING user_id`,
        [user.full_name, user.full_name]
      );

      if (userResult.rows.length > 0) {
        userIds[user.role] = userResult.rows[0].user_id;
        console.log(`   ✅ 建立用戶: ${user.full_name} (${user.role})`);

        // Assign role
        const roleResult = await client.query(
          `SELECT id FROM roles WHERE name = $1`,
          [user.role]
        );

        if (roleResult.rows.length > 0) {
          await client.query(
            `INSERT INTO user_roles (user_id, role_id, assigned_by)
             VALUES ($1, $2, $1)
             ON CONFLICT DO NOTHING`,
            [userIds[user.role], roleResult.rows[0].id]
          );
        }
      } else {
        // User already exists, get their ID
        const existing = await client.query(
          `SELECT user_id FROM user_profiles WHERE full_name = $1 LIMIT 1`,
          [user.full_name]
        );
        if (existing.rows.length > 0) {
          userIds[user.role] = existing.rows[0].user_id;
          console.log(`   ℹ️  用戶已存在: ${user.full_name}`);
        }
      }
    }

    // Use sales user as the main test user
    const testUserId = userIds['sales'] || userIds['super_admin'];

    // ========================================================================
    // 2. 建立測試產品（含成本價）
    // ========================================================================
    console.log('\n2️⃣ 建立測試產品...');

    const testProducts = [
      {
        name_zh: 'Cloud Server 標準方案',
        name_en: 'Cloud Server Standard Plan',
        category: 'Hosting',
        base_price: 15000,
        cost_price: 8000,
        supplier: 'AWS',
        supplier_code: 'EC2-STD-001',
      },
      {
        name_zh: 'Cloud Server 進階方案',
        name_en: 'Cloud Server Premium Plan',
        category: 'Hosting',
        base_price: 30000,
        cost_price: 18000,
        supplier: 'AWS',
        supplier_code: 'EC2-PRE-001',
      },
      {
        name_zh: 'SSL 憑證 (1年)',
        name_en: 'SSL Certificate (1 Year)',
        category: 'Security',
        base_price: 3000,
        cost_price: 1500,
        supplier: 'DigiCert',
        supplier_code: 'SSL-CERT-001',
      },
      {
        name_zh: '網站維護服務 (月)',
        name_en: 'Website Maintenance (Monthly)',
        category: 'Service',
        base_price: 5000,
        cost_price: 2000,
        supplier: null,
        supplier_code: null,
      },
      {
        name_zh: '資料庫備份服務 (月)',
        name_en: 'Database Backup Service (Monthly)',
        category: 'Service',
        base_price: 3000,
        cost_price: 1000,
        supplier: 'AWS',
        supplier_code: 'S3-BACKUP-001',
      },
    ];

    const productIds: string[] = [];

    for (const product of testProducts) {
      const result = await client.query(
        `INSERT INTO products (
           user_id,
           product_number,
           name_zh,
           name_en,
           category,
           base_price,
           currency,
           cost_price,
           cost_currency,
           profit_margin,
           supplier,
           supplier_code,
           unit,
           is_active
         )
         VALUES (
           $1,
           'P' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0'),
           $2, $3, $4, $5, 'TWD', $6, 'TWD',
           ROUND((($5 - $6) / $6 * 100)::NUMERIC, 2),
           $7, $8, '台',
           true
         )
         RETURNING id`,
        [
          testUserId,
          product.name_zh,
          product.name_en,
          product.category,
          product.base_price,
          product.cost_price,
          product.supplier,
          product.supplier_code,
        ]
      );

      productIds.push(result.rows[0].id);
      console.log(`   ✅ 建立產品: ${product.name_zh} (利潤率: ${((product.base_price - product.cost_price) / product.cost_price * 100).toFixed(1)}%)`);
    }

    // ========================================================================
    // 3. 建立測試客戶
    // ========================================================================
    console.log('\n3️⃣ 建立測試客戶...');

    const testCustomers = [
      {
        company_name_zh: '台北科技股份有限公司',
        company_name_en: 'Taipei Tech Co., Ltd.',
        email: 'contact@taipeitech.com',
        phone: '02-2345-6789',
        contract_status: 'prospect',
      },
      {
        company_name_zh: '新竹軟體開發公司',
        company_name_en: 'Hsinchu Software Development',
        email: 'info@hsinchu-soft.com',
        phone: '03-1234-5678',
        contract_status: 'prospect',
      },
      {
        company_name_zh: '台中數位行銷有限公司',
        company_name_en: 'Taichung Digital Marketing Ltd.',
        email: 'hello@tc-digital.com',
        phone: '04-9876-5432',
        contract_status: 'prospect',
      },
      {
        company_name_zh: '高雄雲端服務商',
        company_name_en: 'Kaohsiung Cloud Services',
        email: 'support@kh-cloud.com',
        phone: '07-5555-6666',
        contract_status: 'prospect',
      },
      {
        company_name_zh: '台南資訊科技公司',
        company_name_en: 'Tainan IT Company',
        email: 'it@tainan-tech.com',
        phone: '06-7777-8888',
        contract_status: 'prospect',
      },
    ];

    const customerIds: string[] = [];

    for (const customer of testCustomers) {
      const result = await client.query(
        `INSERT INTO customers (
           user_id,
           customer_number,
           company_name_zh,
           company_name_en,
           email,
           phone,
           contract_status
         )
         VALUES (
           $1,
           'C' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0'),
           $2, $3, $4, $5, $6
         )
         RETURNING id`,
        [
          testUserId,
          customer.company_name_zh,
          customer.company_name_en,
          customer.email,
          customer.phone,
          customer.contract_status,
        ]
      );

      customerIds.push(result.rows[0].id);
      console.log(`   ✅ 建立客戶: ${customer.company_name_zh}`);
    }

    // ========================================================================
    // 4. 建立測試報價單
    // ========================================================================
    console.log('\n4️⃣ 建立測試報價單...');

    const quotationStatuses = ['draft', 'sent', 'accepted', 'accepted', 'sent'];

    for (let i = 0; i < 5; i++) {
      const customerId = customerIds[i];
      const status = quotationStatuses[i];

      // Create quotation
      const quotResult = await client.query(
        `INSERT INTO quotations (
           user_id,
           customer_id,
           quotation_number,
           issue_date,
           expiry_date,
           status,
           subtotal,
           tax_rate,
           tax_amount,
           total,
           currency,
           payment_status,
           notes
         )
         VALUES (
           $1, $2,
           'Q' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD($3::TEXT, 3, '0'),
           CURRENT_DATE - INTERVAL '30 days',
           CURRENT_DATE + INTERVAL '30 days',
           $4,
           50000, 5, 2500, 52500, 'TWD',
           CASE WHEN $4 = 'accepted' THEN 'unpaid' ELSE 'unpaid' END,
           '測試報價單 - 包含多項產品和服務'
         )
         RETURNING id, quotation_number`,
        [testUserId, customerId, i + 1, status]
      );

      const quotationId = quotResult.rows[0].id;
      const quotationNumber = quotResult.rows[0].quotation_number;

      // Add quotation items (2-3 products per quotation)
      const numItems = Math.floor(Math.random() * 2) + 2;
      for (let j = 0; j < numItems; j++) {
        const productId = productIds[Math.floor(Math.random() * productIds.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;

        await client.query(
          `INSERT INTO quotation_items (
             quotation_id,
             product_id,
             quantity,
             unit_price,
             discount_percentage,
             subtotal
           )
           SELECT
             $1,
             $2,
             $3,
             base_price,
             0,
             base_price * $3
           FROM products WHERE id = $2`,
          [quotationId, productId, quantity]
        );
      }

      // For accepted quotations, create contract
      if (status === 'accepted') {
        const signedDate = new Date();
        signedDate.setDate(signedDate.getDate() - 10); // 10 days ago

        const expiryDate = new Date(signedDate);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year contract

        await client.query(
          `UPDATE quotations
           SET contract_signed_date = $1,
               contract_expiry_date = $2,
               payment_frequency = 'quarterly',
               status = 'accepted'
           WHERE id = $3`,
          [signedDate.toISOString().split('T')[0], expiryDate.toISOString().split('T')[0], quotationId]
        );

        // Create contract
        const contractResult = await client.query(
          `INSERT INTO customer_contracts (
             user_id,
             customer_id,
             quotation_id,
             contract_number,
             title,
             start_date,
             end_date,
             signed_date,
             total_amount,
             currency,
             payment_terms,
             status
           )
           VALUES (
             $1, $2, $3,
             'C' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD($4::TEXT, 3, '0'),
             '合約 - ' || $5,
             $6, $7, $6,
             52500, 'TWD', 'quarterly', 'active'
           )
           RETURNING id`,
          [
            testUserId,
            customerId,
            quotationId,
            i + 1,
            quotationNumber,
            signedDate.toISOString().split('T')[0],
            expiryDate.toISOString().split('T')[0],
          ]
        );

        const contractId = contractResult.rows[0].id;

        // Generate payment schedules (quarterly = 4 payments)
        await client.query(
          `SELECT generate_payment_schedules_for_contract($1, $2, 5)`,
          [contractId, signedDate.toISOString().split('T')[0]]
        );

        console.log(`   ✅ 建立報價單: ${quotationNumber} (${status}) → 已轉換為合約`);
      } else {
        console.log(`   ✅ 建立報價單: ${quotationNumber} (${status})`);
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ 測試資料建立完成！\n');
    console.log('測試帳號:');
    console.log('  - super_admin@test.com (總管理員)');
    console.log('  - owner@test.com (公司負責人)');
    console.log('  - manager@test.com (業務主管)');
    console.log('  - sales@test.com (業務人員)');
    console.log('  - accountant@test.com (會計)');
    console.log('\n注意：這些用戶需要通過 Supabase Auth 註冊才能登入。');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 建立測試資料時發生錯誤:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
seedTestData()
  .then(() => {
    console.log('🎉 測試資料腳本執行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 測試資料腳本執行失敗:', error);
    process.exit(1);
  });
