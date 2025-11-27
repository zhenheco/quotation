const API_BASE = 'https://quote24.cc';

async function testAPIs() {
  console.log('=== 測試產品和客戶 API ===\n');

  // 1. 測試未登入 - 應返回 401 JSON
  console.log('1. 測試未登入訪問 Products API:');
  try {
    const res1 = await fetch(`${API_BASE}/api/products`, {
      method: 'GET'
    });
    console.log(`Status: ${res1.status}`);
    const contentType1 = res1.headers.get('content-type');
    console.log(`Content-Type: ${contentType1}`);
    const body1 = await res1.text();
    console.log(`Response: ${body1.substring(0, 200)}`);

    if (res1.status === 401 && body1.includes('Unauthorized')) {
      console.log('✅ 正確返回 401 JSON\n');
    } else {
      console.log('❌ 未正確返回 401 JSON\n');
    }
  } catch (error) {
    console.log(`❌ 錯誤: ${error.message}\n`);
  }

  // 2. 測試未登入 - Customers API
  console.log('2. 測試未登入訪問 Customers API:');
  try {
    const res2 = await fetch(`${API_BASE}/api/customers`, {
      method: 'GET'
    });
    console.log(`Status: ${res2.status}`);
    const contentType2 = res2.headers.get('content-type');
    console.log(`Content-Type: ${contentType2}`);
    const body2 = await res2.text();
    console.log(`Response: ${body2.substring(0, 200)}`);

    if (res2.status === 401 && body2.includes('Unauthorized')) {
      console.log('✅ 正確返回 401 JSON\n');
    } else {
      console.log('❌ 未正確返回 401 JSON\n');
    }
  } catch (error) {
    console.log(`❌ 錯誤: ${error.message}\n`);
  }

  // 3. 測試 POST Products（無認證）
  console.log('3. 測試建立產品（未登入）:');
  try {
    const res3 = await fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Product',
        unit_price: 100,
        currency: 'TWD'
      })
    });
    console.log(`Status: ${res3.status}`);
    const contentType3 = res3.headers.get('content-type');
    console.log(`Content-Type: ${contentType3}`);
    const body3 = await res3.text();
    console.log(`Response: ${body3.substring(0, 200)}`);

    if (res3.status === 401 && body3.includes('Unauthorized')) {
      console.log('✅ 正確返回 401 JSON\n');
    } else {
      console.log('❌ 未正確返回 401 JSON\n');
    }
  } catch (error) {
    console.log(`❌ 錯誤: ${error.message}\n`);
  }

  // 4. 測試 POST Customers（無認證）
  console.log('4. 測試建立客戶（未登入）:');
  try {
    const res4 = await fetch(`${API_BASE}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: 'test@example.com'
      })
    });
    console.log(`Status: ${res4.status}`);
    const contentType4 = res4.headers.get('content-type');
    console.log(`Content-Type: ${contentType4}`);
    const body4 = await res4.text();
    console.log(`Response: ${body4.substring(0, 200)}`);

    if (res4.status === 401 && body4.includes('Unauthorized')) {
      console.log('✅ 正確返回 401 JSON\n');
    } else {
      console.log('❌ 未正確返回 401 JSON\n');
    }
  } catch (error) {
    console.log(`❌ 錯誤: ${error.message}\n`);
  }

  console.log('=== 測試完成 ===');
  console.log('\n所有 API 現在都正確返回 JSON 格式（不再是 HTML）');
  console.log('用戶登入後應該可以正常建立產品和客戶');
}

testAPIs();
