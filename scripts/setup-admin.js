const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur',
});

const ADMIN_USER_ID = '2ba3df78-8b23-4b3f-918b-d4f7eea2bfba'; // acejou's UUID
const ADMIN_FULL_NAME = '周振家';
const ADMIN_DISPLAY_NAME = 'Ace周振家';

async function setupAdmin() {
  const client = await pool.connect();

  try {
    console.log('👤 Setting up admin account...\n');
    console.log(`User ID: ${ADMIN_USER_ID}`);
    console.log(`Full Name: ${ADMIN_FULL_NAME}`);
    console.log(`Display Name: ${ADMIN_DISPLAY_NAME}\n`);

    // Check if user profile exists
    const existingProfile = await client.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [ADMIN_USER_ID]
    );

    if (existingProfile.rows.length > 0) {
      console.log('⚠️  User profile already exists. Updating...');
      await client.query(
        `UPDATE user_profiles
         SET full_name = $1, display_name = $2, updated_at = NOW()
         WHERE user_id = $3`,
        [ADMIN_FULL_NAME, ADMIN_DISPLAY_NAME, ADMIN_USER_ID]
      );
      console.log('✅ User profile updated');
    } else {
      console.log('📝 Creating user profile...');
      await client.query(
        `INSERT INTO user_profiles (user_id, full_name, display_name)
         VALUES ($1, $2, $3)`,
        [ADMIN_USER_ID, ADMIN_FULL_NAME, ADMIN_DISPLAY_NAME]
      );
      console.log('✅ User profile created');
    }

    // Check if user already has super_admin role
    const existingRole = await client.query(
      `SELECT ur.*
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND r.name = 'super_admin'`,
      [ADMIN_USER_ID]
    );

    if (existingRole.rows.length > 0) {
      console.log('✅ User already has super_admin role');
    } else {
      console.log('🔑 Assigning super_admin role...');
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles WHERE name = 'super_admin'`,
        [ADMIN_USER_ID]
      );
      console.log('✅ super_admin role assigned');
    }

    // Verify permissions
    const permissions = await client.query(
      `SELECT COUNT(*) as count FROM user_permissions WHERE user_id = $1`,
      [ADMIN_USER_ID]
    );

    console.log(`\n🎉 Setup complete!`);
    console.log(`   User: ${ADMIN_DISPLAY_NAME}`);
    console.log(`   Role: Super Admin (總管理員)`);
    console.log(`   Permissions: ${permissions.rows[0].count} permissions granted`);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupAdmin()
  .then(() => {
    console.log('\n✅ Admin setup successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
