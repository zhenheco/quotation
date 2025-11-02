const BASE_URL = 'https://quotation.zhenhe-dm.com';
const EMAIL = 'acejou27@gmail.com';
const PASSWORD = 'Aa090116';

async function testAPIs() {
  console.log('=== 測試 API 端點 ===\n');

  try {
    // 1. 登入取得 session
    console.log('1. 登入...');
    const loginRes = await fetch(`${BASE_URL}/auth/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    const cookies = loginRes.headers.get('set-cookie');
    console.log('登入狀態:', loginRes.status);

    if (!cookies) {
      console.log('⚠️  沒有取得 cookies，嘗試直接使用 Supabase auth');
    }

    // 2. 測試建立客戶
    console.log('\n2. 測試建立客戶...');
    const timestamp = Date.now();
    const customerData = {
      name: `測試客戶 ${timestamp}`,
      email: `test${timestamp}@example.com`,
      phone: '0912345678',
      address: '測試地址 123',
      contact_person: '王小明'
    };

    console.log('發送資料:', customerData);

    const createCustomerRes = await fetch(`${BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(customerData)
    });

    console.log('回應狀態:', createCustomerRes.status);
    const customerResult = await createCustomerRes.json();
    console.log('回應內容:', JSON.stringify(customerResult, null, 2));

    if (createCustomerRes.status === 201) {
      console.log('✅ 客戶建立成功');
    } else {
      console.log('❌ 客戶建立失敗:', customerResult);
    }

    // 3. 測試建立產品
    console.log('\n3. 測試建立產品...');
    const productData = {
      name: `測試產品 ${timestamp}`,
      description: '這是一個測試產品',
      unit_price: 999.99,
      currency: 'TWD',
      category: '測試類別'
    };

    console.log('發送資料:', productData);

    const createProductRes = await fetch(`${BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(productData)
    });

    console.log('回應狀態:', createProductRes.status);
    const productResult = await createProductRes.json();
    console.log('回應內容:', JSON.stringify(productResult, null, 2));

    if (createProductRes.status === 201) {
      console.log('✅ 產品建立成功');

      // 4. 測試更新產品價格
      console.log('\n4. 測試更新產品價格...');
      const updateData = {
        unit_price: 888.88
      };

      const updateProductRes = await fetch(`${BASE_URL}/api/products/${productResult.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies || ''
        },
        body: JSON.stringify(updateData)
      });

      console.log('回應狀態:', updateProductRes.status);
      const updateResult = await updateProductRes.json();
      console.log('回應內容:', JSON.stringify(updateResult, null, 2));

      if (updateResult.unit_price === 888.88) {
        console.log('✅ 產品價格更新成功');
      } else {
        console.log('❌ 產品價格更新失敗');
      }
    } else {
      console.log('❌ 產品建立失敗:', productResult);
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testAPIs();
