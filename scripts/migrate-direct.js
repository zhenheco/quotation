const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur',
});

async function runMigrationDirect() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migration...');

    // Test connection
    const testResult = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful at:', testResult.rows[0].now);

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
      console.log('\n✅ Migration appears to have already been run.');
      console.log('   Verifying all tables...\n');
    } else {
      console.log('\n📝 No existing RBAC tables found. Running migration...\n');

      // Read migration file (fixed version)
      const migrationPath = path.join(__dirname, '../migrations/002_rbac_fixed.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Execute migration
      console.log('⏳ Executing SQL... (this may take a moment)\n');
      await client.query(migrationSQL);
      console.log('✅ SQL executed successfully!\n');
    }

    // Verify all tables
    const allTables = await client.query(`
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

    console.log('📊 RBAC Tables Status:');
    const expectedTables = [
      'audit_logs', 'company_settings', 'customer_contracts',
      'payments', 'payment_schedules', 'permissions',
      'role_permissions', 'roles', 'user_profiles', 'user_roles'
    ];

    expectedTables.forEach(tableName => {
      const exists = allTables.rows.find(row => row.table_name === tableName);
      console.log(`  ${exists ? '✅' : '❌'} ${tableName}`);
    });

    // Check roles
    const roles = await client.query('SELECT name, name_zh, level FROM roles ORDER BY level');
    console.log('\n👥 System Roles:');
    roles.rows.forEach(row => {
      console.log(`  ✓ Level ${row.level}: ${row.name} (${row.name_zh})`);
    });

    // Check permissions count
    const permCount = await client.query('SELECT COUNT(*) as count FROM permissions');
    console.log(`\n🔑 Permissions: ${permCount.rows[0].count} defined`);

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrationDirect()
  .then(() => {
    console.log('\n🎉 Migration check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
