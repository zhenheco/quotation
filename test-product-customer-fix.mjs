import puppeteer from 'puppeteer';

const BASE_URL = 'https://quote24.cc';

async function testProductAndCustomerFix() {
  console.log('=== 測試產品和客戶修復 ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 監聽 console 訊息
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      console.log(`❌ Console Error: ${text}`);
    } else if (type === 'warning') {
      console.log(`⚠️  Console Warning: ${text}`);
    }
  });

  // 監聽網路請求失敗
  page.on('requestfailed', request => {
    console.log(`❌ Request Failed: ${request.url()} - ${request.failure().errorText}`);
  });

  try {
    console.log('1. 前往登入頁面...');
    await page.goto(`${BASE_URL}/zh/login`, { waitUntil: 'networkidle2' });

    console.log('2. 輸入登入資訊...');
    // 從環境變數或直接使用測試帳號
    const email = 'acejou27@gmail.com';
    const password = 'Aa090116';

    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);

    console.log('3. 點擊登入按鈕...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // 等待登入成功
    await page.waitForTimeout(2000);
    console.log('✅ 登入成功\n');

    // ===== 測試產品編輯 =====
    console.log('4. 前往產品列表...');
    await page.goto(`${BASE_URL}/zh/products`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    // 檢查是否有產品
    const hasProducts = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      return rows.length > 0;
    });

    if (hasProducts) {
      console.log('5. 點擊編輯第一個產品...');
      await page.evaluate(() => {
        const editButton = document.querySelector('a[href*="/products/"]');
        if (editButton) editButton.click();
      });
      await page.waitForTimeout(2000);

      console.log('6. 嘗試修改產品價格...');
      const priceInput = await page.$('input[name="unit_price"]');
      if (priceInput) {
        await priceInput.click({ clickCount: 3 }); // 選取全部
        await priceInput.type('999.99');

        console.log('7. 點擊儲存按鈕...');

        // 監聽 API 請求
        const apiResponse = await new Promise(async (resolve) => {
          page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/products/') && response.request().method() === 'PUT') {
              const status = response.status();
              let body = null;
              try {
                body = await response.json();
              } catch {
                body = await response.text();
              }
              resolve({ url, status, body });
            }
          });

          await page.click('button[type="submit"]');
        });

        console.log(`\n📡 PUT /api/products/[id] Response:`);
        console.log(`Status: ${apiResponse.status}`);
        console.log(`Body:`, JSON.stringify(apiResponse.body, null, 2));

        if (apiResponse.status === 200) {
          console.log('✅ 產品更新成功！\n');
        } else {
          console.log('❌ 產品更新失敗！\n');
        }
      } else {
        console.log('⚠️  找不到價格輸入欄位\n');
      }
    } else {
      console.log('⚠️  沒有產品可以編輯，建立新產品...\n');

      console.log('5. 前往新增產品頁面...');
      await page.goto(`${BASE_URL}/zh/products/new`, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(1000);

      console.log('6. 填寫產品資訊...');
      await page.type('input[placeholder*="名稱"]', '測試產品');
      await page.type('input[name="unit_price"]', '100');

      // 選擇幣別
      await page.select('select[name="currency"]', 'TWD');

      console.log('7. 點擊建立按鈕...');

      // 監聽 API 請求
      const apiResponse = await new Promise(async (resolve) => {
        page.on('response', async (response) => {
          const url = response.url();
          if (url.includes('/api/products') && response.request().method() === 'POST') {
            const status = response.status();
            let body = null;
            try {
              body = await response.json();
            } catch {
              body = await response.text();
            }
            resolve({ url, status, body });
          }
        });

        await page.click('button[type="submit"]');
      });

      console.log(`\n📡 POST /api/products Response:`);
      console.log(`Status: ${apiResponse.status}`);
      console.log(`Body:`, JSON.stringify(apiResponse.body, null, 2));

      if (apiResponse.status === 201) {
        console.log('✅ 產品建立成功！\n');
      } else {
        console.log('❌ 產品建立失敗！\n');
      }
    }

    // ===== 測試客戶儲存 =====
    console.log('8. 前往客戶列表...');
    await page.goto(`${BASE_URL}/zh/customers`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    console.log('9. 點擊新增客戶...');
    await page.goto(`${BASE_URL}/zh/customers/new`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    console.log('10. 填寫客戶資訊...');
    await page.type('input[name="name"]', '測試客戶');
    await page.type('input[name="email"]', 'test@example.com');

    console.log('11. 點擊建立按鈕...');

    // 監聽 API 請求
    const customerResponse = await new Promise(async (resolve) => {
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/api/customers') && response.request().method() === 'POST') {
          const status = response.status();
          let body = null;
          try {
            body = await response.json();
          } catch {
            body = await response.text();
          }
          resolve({ url, status, body });
        }
      });

      await page.click('button[type="submit"]');
    });

    console.log(`\n📡 POST /api/customers Response:`);
    console.log(`Status: ${customerResponse.status}`);
    console.log(`Body:`, JSON.stringify(customerResponse.body, null, 2));

    if (customerResponse.status === 201) {
      console.log('✅ 客戶建立成功！\n');
    } else {
      console.log('❌ 客戶建立失敗！\n');
    }

    console.log('=== 測試完成 ===');

    // 保持瀏覽器開啟 10 秒以便查看
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
  } finally {
    await browser.close();
  }
}

testProductAndCustomerFix();
