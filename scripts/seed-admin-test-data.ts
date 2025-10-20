/**
 * 超級管理員測試資料生成腳本
 *
 * 建立測試用的公司、使用者、角色關係
 */

import { query } from '../lib/db/zeabur';

interface TestUser {
  email: string;
  name: string;
  user_id?: string;
}

interface TestCompany {
  name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  owner_email: string;
}

async function seedAdminTestData() {
  console.log('🌱 開始建立超級管理員測試資料...\n');

  try {
    // ==================== 步驟 1: 建立測試公司 ====================
    console.log('📊 步驟 1: 建立測試公司...');

    const testCompanies: TestCompany[] = [
      {
        name: '台灣科技股份有限公司',
        tax_id: '12345678',
        email: 'contact@taiwantech.com.tw',
        phone: '02-2345-6789',
        address: '台北市信義區信義路五段7號',
        owner_email: 'owner1@example.com'
      },
      {
        name: '優質貿易有限公司',
        tax_id: '23456789',
        email: 'info@goodtrade.com.tw',
        phone: '03-1234-5678',
        address: '新竹市東區光復路二段101號',
        owner_email: 'owner2@example.com'
      },
      {
        name: '創新設計工作室',
        tax_id: '34567890',
        email: 'hello@creative.design',
        phone: '04-2345-6789',
        address: '台中市西屯區台灣大道三段99號',
        owner_email: 'owner3@example.com'
      },
      {
        name: '全球物流企業',
        tax_id: '45678901',
        email: 'service@globallogistics.com',
        phone: '07-1234-5678',
        address: '高雄市前鎮區中山四路100號',
        owner_email: 'owner4@example.com'
      },
      {
        name: '數位行銷顧問公司',
        tax_id: '56789012',
        email: 'contact@digitalmarketing.tw',
        phone: '02-8765-4321',
        address: '台北市松山區南京東路四段133號',
        owner_email: 'owner5@example.com'
      }
    ];

    const companyIds: string[] = [];

    for (const company of testCompanies) {
      const result = await query(`
        INSERT INTO companies (name, tax_id, email, phone, address)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tax_id) DO UPDATE
        SET name = EXCLUDED.name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            updated_at = NOW()
        RETURNING id
      `, [company.name, company.tax_id, company.email, company.phone, company.address]);

      companyIds.push(result.rows[0].id);
      console.log(`  ✅ 已建立/更新公司: ${company.name}`);
    }

    console.log(`\n✨ 成功建立 ${companyIds.length} 間公司\n`);

    // ==================== 步驟 2: 確認測試使用者存在 ====================
    console.log('👥 步驟 2: 檢查測試使用者...');

    const testUsers: TestUser[] = [
      { email: 'owner1@example.com', name: '陳大明' },
      { email: 'owner2@example.com', name: '林小華' },
      { email: 'owner3@example.com', name: '王美玲' },
      { email: 'owner4@example.com', name: '張志強' },
      { email: 'owner5@example.com', name: '李雅婷' },
      { email: 'manager1@example.com', name: '劉經理' },
      { email: 'sales1@example.com', name: '黃業務' },
      { email: 'sales2@example.com', name: '吳業務' },
      { email: 'accountant1@example.com', name: '鄭會計' },
      { email: 'employee1@example.com', name: '周員工' }
    ];

    // 提示：這些使用者需要先透過 Google OAuth 登入一次
    console.log('\n⚠️  重要提示：');
    console.log('   以下測試使用者需要先透過 Google OAuth 登入系統一次，');
    console.log('   系統會自動建立 user_profiles 記錄。\n');
    console.log('   測試使用者帳號：');
    testUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.name})`);
    });
    console.log('');

    // 檢查已存在的使用者
    const existingUsersResult = await query(`
      SELECT user_id, email
      FROM user_profiles
      WHERE email = ANY($1)
    `, [testUsers.map(u => u.email)]);

    const existingUsers = new Map(
      existingUsersResult.rows.map((row: any) => [row.email, row.user_id])
    );

    console.log(`📋 已在系統中的使用者: ${existingUsers.size}/${testUsers.length}`);
    existingUsers.forEach((userId, email) => {
      console.log(`  ✅ ${email}`);
    });

    if (existingUsers.size < testUsers.length) {
      console.log('\n⏸️  尚未登入的使用者:');
      testUsers.forEach(user => {
        if (!existingUsers.has(user.email)) {
          console.log(`  ⚠️  ${user.email} - 請先登入一次`);
        }
      });

      console.log('\n請先讓所有測試使用者登入後，再次執行此腳本完成設定。');
      console.log('或者繼續執行，只設定已登入的使用者...\n');
    }

    // ==================== 步驟 3: 設定公司擁有者 ====================
    console.log('\n🏢 步驟 3: 設定公司擁有者...');

    for (let i = 0; i < testCompanies.length; i++) {
      const company = testCompanies[i];
      const companyId = companyIds[i];
      const ownerUserId = existingUsers.get(company.owner_email);

      if (!ownerUserId) {
        console.log(`  ⏭️  跳過 ${company.name} - 擁有者 ${company.owner_email} 尚未登入`);
        continue;
      }

      // 更新公司的 owner_id
      await query(`
        UPDATE companies
        SET owner_id = $1
        WHERE id = $2
      `, [ownerUserId, companyId]);

      // 確保擁有者有 company_owner 角色
      const ownerRoleResult = await query(`
        SELECT id FROM roles WHERE role_name = 'company_owner'
      `);
      const ownerRoleId = ownerRoleResult.rows[0].id;

      await query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [ownerUserId, ownerRoleId]);

      // 將擁有者加入公司成員
      await query(`
        INSERT INTO company_members (company_id, user_id, role_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (company_id, user_id) DO UPDATE
        SET role_id = EXCLUDED.role_id,
            deleted_at = NULL
      `, [companyId, ownerUserId, ownerRoleId]);

      console.log(`  ✅ ${company.name} - 擁有者: ${company.owner_email}`);
    }

    // ==================== 步驟 4: 新增公司成員 ====================
    console.log('\n👥 步驟 4: 新增公司成員...');

    // 獲取角色 ID
    const rolesResult = await query(`
      SELECT id, role_name FROM roles
      WHERE role_name IN ('sales_manager', 'salesperson', 'accountant')
    `);

    const roleMap = new Map(
      rolesResult.rows.map((row: any) => [row.role_name, row.id])
    );

    // 為每個公司新增成員
    const memberAssignments = [
      // 公司 1: 台灣科技
      { companyIndex: 0, email: 'manager1@example.com', role: 'sales_manager' },
      { companyIndex: 0, email: 'sales1@example.com', role: 'salesperson' },
      { companyIndex: 0, email: 'accountant1@example.com', role: 'accountant' },

      // 公司 2: 優質貿易
      { companyIndex: 1, email: 'sales2@example.com', role: 'salesperson' },
      { companyIndex: 1, email: 'employee1@example.com', role: 'salesperson' },

      // 公司 3: 創新設計
      { companyIndex: 2, email: 'manager1@example.com', role: 'sales_manager' },

      // 公司 4 和 5: 只有擁有者
    ];

    for (const assignment of memberAssignments) {
      const companyId = companyIds[assignment.companyIndex];
      const userId = existingUsers.get(assignment.email);
      const roleId = roleMap.get(assignment.role);

      if (!userId) {
        console.log(`  ⏭️  跳過成員 ${assignment.email} - 尚未登入`);
        continue;
      }

      if (!roleId) {
        console.log(`  ⚠️  角色 ${assignment.role} 不存在`);
        continue;
      }

      // 新增角色到使用者
      await query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [userId, roleId]);

      // 新增到公司成員
      await query(`
        INSERT INTO company_members (company_id, user_id, role_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (company_id, user_id) DO UPDATE
        SET role_id = EXCLUDED.role_id,
            deleted_at = NULL
      `, [companyId, userId, roleId]);

      const companyName = testCompanies[assignment.companyIndex].name;
      console.log(`  ✅ ${companyName} - 新增成員: ${assignment.email} (${assignment.role})`);
    }

    // ==================== 步驟 5: 更新使用者名稱 ====================
    console.log('\n✏️  步驟 5: 更新使用者名稱...');

    for (const user of testUsers) {
      const userId = existingUsers.get(user.email);
      if (!userId) continue;

      await query(`
        UPDATE user_profiles
        SET name = $1
        WHERE user_id = $2
      `, [user.name, userId]);

      console.log(`  ✅ 更新名稱: ${user.email} → ${user.name}`);
    }

    // ==================== 完成統計 ====================
    console.log('\n📊 測試資料建立完成！\n');
    console.log('統計資訊：');
    console.log(`  - 公司總數: ${companyIds.length}`);
    console.log(`  - 已設定的使用者: ${existingUsers.size}`);
    console.log(`  - 成員關係: ${memberAssignments.length}`);

    console.log('\n✨ 可以開始測試超級管理員控制台了！');
    console.log('   訪問: http://localhost:3001/admin\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
    throw error;
  }
}

// 執行腳本
seedAdminTestData()
  .then(() => {
    console.log('✅ 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 腳本執行失敗:', error);
    process.exit(1);
  });
