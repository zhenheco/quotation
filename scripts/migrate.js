const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.ZEABUR_POSTGRES_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migration...');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/001_rbac_and_new_features.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');

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

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  });
