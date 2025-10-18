const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const pool = new Pool({
  connectionString: process.env.ZEABUR_POSTGRES_URL,
});

async function runMigrationStepByStep() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migration (step by step)...');
    console.log('📝 Connection string:', process.env.ZEABUR_POSTGRES_URL ? 'Found' : 'NOT FOUND');

    // Test connection
    await client.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Check if tables already exist
    const existingTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('roles', 'permissions', 'user_roles')
    `);

    if (existingTables.rows.length > 0) {
      console.log('\n⚠️  Some tables already exist:');
      existingTables.rows.forEach(row => console.log(`  - ${row.table_name}`));
      console.log('\n❓ Skipping migration to avoid conflicts.');
      console.log('   If you want to re-run, please drop these tables first.');
      return;
    }

    // Read and split migration file
    const migrationPath = path.join(__dirname, '../migrations/001_rbac_and_new_features.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by major sections (marked by ============)
    const sections = migrationSQL.split(/-- ={70,}/);

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;

      // Extract section title
      const titleMatch = section.match(/^-- (.+)/);
      const title = titleMatch ? titleMatch[1] : `Section ${i + 1}`;

      console.log(`\n📦 Executing: ${title}`);

      try {
        await client.query(section);
        console.log(`   ✅ Success`);
      } catch (error) {
        console.error(`   ❌ Error in section:`, error.message);
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'roles', 'permissions', 'role_permissions', 'user_roles',
        'user_profiles', 'company_settings', 'customer_contracts',
        'payments', 'payment_schedules', 'audit_logs'
      )
      ORDER BY table_name
    `);

    console.log('\n📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Check roles
    const roles = await client.query('SELECT name, name_zh FROM roles ORDER BY level');
    console.log('\n👥 Created roles:');
    roles.rows.forEach(row => {
      console.log(`  ✓ ${row.name} (${row.name_zh})`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrationStepByStep()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
