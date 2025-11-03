/**
 * 測試產品選擇功能的腳本
 * 驗證 getProducts() 返回的資料是否包含 unit_price 和 currency 欄位
 */

import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env.local') });

import { getProducts } from '../lib/services/database.ts';

async function testProductSelection() {
  console.log('🧪 開始測試產品選擇功能...\n');

  try {
    // 使用測試用戶 ID
    const testUserId = '6a1e3e22-1a8f-4d4f-b0db-bcc42bcc6158';

    console.log(`📋 取得用戶產品清單 (userId: ${testUserId})`);
    const products = await getProducts(testUserId);

    console.log(`\n✅ 成功取得 ${products.length} 個產品\n`);

    if (products.length === 0) {
      console.log('⚠️  沒有產品資料，請先建立產品');
      return;
    }

    // 檢查第一個產品的欄位
    const firstProduct = products[0];
    console.log('🔍 檢查第一個產品的欄位：');
    console.log('─'.repeat(60));

    const requiredFields = {
      'unit_price': firstProduct.unit_price,
      'currency': firstProduct.currency,
      'base_price': firstProduct.base_price,
      'base_currency': firstProduct.base_currency
    };

    let allFieldsPresent = true;

    for (const [field, value] of Object.entries(requiredFields)) {
      const status = value !== undefined ? '✅' : '❌';
      console.log(`${status} ${field.padEnd(20)} = ${value}`);

      if (field === 'unit_price' || field === 'currency') {
        if (value === undefined) {
          allFieldsPresent = false;
        }
      }
    }

    console.log('─'.repeat(60));

    if (allFieldsPresent) {
      console.log('\n✅ 所有必要欄位都存在！');
      console.log('✅ 欄位映射正確：unit_price ←→ base_price, currency ←→ base_currency');

      // 驗證值是否一致
      if (firstProduct.unit_price === firstProduct.base_price &&
          firstProduct.currency === firstProduct.base_currency) {
        console.log('✅ 欄位值映射正確');
      } else {
        console.log('⚠️  欄位值不一致');
      }
    } else {
      console.log('\n❌ 缺少必要欄位 unit_price 或 currency');
      console.log('❌ 產品選擇功能將無法正確顯示價格資訊');
    }

    console.log('\n📊 完整產品資料：');
    console.log(JSON.stringify(firstProduct, null, 2));

  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testProductSelection()
  .then(() => {
    console.log('\n✅ 測試完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 測試執行失敗:', error);
    process.exit(1);
  });
