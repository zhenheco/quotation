const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur',
});

async function findUserId() {
  const client = await pool.connect();

  try {
    console.log('🔍 Searching for existing user IDs in database...\n');

    // Check customers table
    const customers = await client.query(
      'SELECT DISTINCT user_id FROM customers LIMIT 1'
    );

    if (customers.rows.length > 0) {
      const userId = customers.rows[0].user_id;
      console.log('✅ Found user ID from customers table:');
      console.log(`   ${userId}\n`);

      // Show all data for this user
      const customerCount = await client.query(
        'SELECT COUNT(*) as count FROM customers WHERE user_id = $1',
        [userId]
      );
      const productCount = await client.query(
        'SELECT COUNT(*) as count FROM products WHERE user_id = $1',
        [userId]
      );
      const quotationCount = await client.query(
        'SELECT COUNT(*) as count FROM quotations WHERE user_id = $1',
        [userId]
      );

      console.log('📊 Data for this user:');
      console.log(`   Customers: ${customerCount.rows[0].count}`);
      console.log(`   Products: ${productCount.rows[0].count}`);
      console.log(`   Quotations: ${quotationCount.rows[0].count}`);

      console.log('\n💡 Use this UUID to set up your admin account.');
      return userId;
    }

    // Check products table
    const products = await client.query(
      'SELECT DISTINCT user_id FROM products LIMIT 1'
    );

    if (products.rows.length > 0) {
      const userId = products.rows[0].user_id;
      console.log('✅ Found user ID from products table:');
      console.log(`   ${userId}\n`);
      return userId;
    }

    // Check quotations table
    const quotations = await client.query(
      'SELECT DISTINCT user_id FROM quotations LIMIT 1'
    );

    if (quotations.rows.length > 0) {
      const userId = quotations.rows[0].user_id;
      console.log('✅ Found user ID from quotations table:');
      console.log(`   ${userId}\n`);
      return userId;
    }

    console.log('⚠️  No existing user IDs found in database.');
    console.log('   This might be a fresh installation.');
    console.log('\n💡 To get your user ID:');
    console.log('   1. Log in to the app at http://localhost:3000');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Run: supabase.auth.getUser().then(({data}) => console.log(data.user.id))');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

findUserId()
  .then(() => {
    console.log('\n✅ Search complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
