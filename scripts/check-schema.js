const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://root:kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W@43.159.54.250:30428/zeabur',
});

async function checkSchema() {
  const client = await pool.connect();

  try {
    console.log('🔍 Checking existing database schema...\n');

    // Check products table structure
    const productsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'products'
      ORDER BY ordinal_position
    `);

    console.log('📦 Products table columns:');
    productsColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Check customers table structure
    const customersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'customers'
      ORDER BY ordinal_position
    `);

    console.log('\n👥 Customers table columns:');
    customersColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Check quotations table structure
    const quotationsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'quotations'
      ORDER BY ordinal_position
    `);

    console.log('\n📄 Quotations table columns:');
    quotationsColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema()
  .then(() => {
    console.log('\n✅ Schema check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
