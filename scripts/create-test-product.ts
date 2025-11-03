import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env.local') });

import { createProduct } from '../lib/services/database.ts';

async function createTestProduct() {
  console.log('🧪 建立測試產品...\n');

  const testUserId = '6a1e3e22-1a8f-4d4f-b0db-bcc42bcc6158';

  const productData = {
    user_id: testUserId,
    sku: 'TEST-001',
    name: '測試產品 - 驗證欄位映射',
    description: '用於測試 unit_price 和 currency 欄位映射的產品',
    unit_price: 1000,
    currency: 'TWD',
    category: 'test',
    cost_price: 800,
    cost_currency: 'TWD',
    profit_margin: 0.25,
    supplier: '測試供應商',
    supplier_code: 'SUP-TEST-001'
  };

  try {
    console.log('📦 建立產品資料：');
    console.log(JSON.stringify(productData, null, 2));

    const createdProduct = await createProduct(productData);

    console.log('\n✅ 產品建立成功！');
    console.log('\n🔍 檢查返回的產品資料：');
    console.log('─'.repeat(60));
    console.log(`✅ unit_price    = ${createdProduct.unit_price}`);
    console.log(`✅ currency      = ${createdProduct.currency}`);
    console.log(`✅ base_price    = ${createdProduct.base_price}`);
    console.log(`✅ base_currency = ${createdProduct.base_currency}`);
    console.log('─'.repeat(60));

    if (createdProduct.unit_price === productData.unit_price &&
        createdProduct.currency === productData.currency) {
      console.log('\n✅ 欄位映射正確！產品建立功能正常');
    } else {
      console.log('\n❌ 欄位映射錯誤！');
    }

    console.log('\n📊 完整產品資料：');
    console.log(JSON.stringify(createdProduct, null, 2));

  } catch (error) {
    console.error('\n❌ 建立產品失敗:', error);
    process.exit(1);
  }
}

createTestProduct()
  .then(() => {
    console.log('\n✅ 完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 執行失敗:', error);
    process.exit(1);
  });
