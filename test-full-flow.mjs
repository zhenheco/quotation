import puppeteer from 'puppeteer';

const BASE_URL = 'https://quote24.cc';
const EMAIL = 'acejou27@gmail.com';
const PASSWORD = 'Aa090116';

async function testFullFlow() {
  console.log('=== 完整功能測試 ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 監聽所有請求
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();

    if (url.includes('/api/') && (status >= 400 || status === 201)) {
      console.log(`\n📡 API: ${method} ${url}`);
      console.log(`   Status: ${status}`);

      try {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          const body = await response.json();
          console.log(`   Response:`, JSON.stringify(body, null, 2));
        }
      } catch {
        // ignore
      }
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ Console Error: ${msg.text()}`);
    }
  });

  try {
    // 1. 登入
    console.log('1. 登入...');
    await page.goto(`${BASE_URL}/zh/login`, { waitUntil: 'networkidle2' });
    await page.type('input[name="email"]', EMAIL);
    await page.type('input[name="password"]', PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    await page.waitForTimeout(2000);
    console.log('✅ 登入成功\n');

    // 2. 測試產品編輯
    console.log('2. 測試產品編輯...');
    await page.goto(`${BASE_URL}/zh/products`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    const hasProducts = await page.evaluate(() => {
      const rows = document.querySelectorAll('tbody tr');
      return rows.length > 0;
    });

    if (hasProducts) {
      console.log('   點擊編輯第一個產品...');
      await page.evaluate(() => {
        const editButton = document.querySelector('a[href*="/products/"]');
        if (editButton) editButton.click();
      });
      await page.waitForTimeout(3000);

      console.log('   修改價格為 888.88...');
      const priceInput = await page.$('input[name="unit_price"]');
      if (priceInput) {
        await priceInput.click({ clickCount: 3 });
        await priceInput.type('888.88');

        console.log('   點擊儲存...');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);

        console.log('   重新載入頁面確認價格...');
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);

        const newPrice = await page.$eval('input[name="unit_price"]', el => el.value);
        console.log(`   價格檢查: ${newPrice}`);

        if (newPrice === '888.88') {
          console.log('   ✅ 產品價格儲存成功！');
        } else {
          console.log(`   ❌ 產品價格未正確儲存！預期 888.88，實際 ${newPrice}`);
        }
      }
    } else {
      console.log('   ⚠️  沒有產品可測試');
    }

    // 3. 測試新增客戶
    console.log('\n3. 測試新增客戶...');
    await page.goto(`${BASE_URL}/zh/customers/new`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    const timestamp = Date.now();
    console.log(`   填寫客戶資訊（測試 ${timestamp}）...`);
    await page.type('input[name="name"]', `測試客戶 ${timestamp}`);
    await page.type('input[name="email"]', `test${timestamp}@example.com`);

    console.log('   點擊建立...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('/customers') && !currentUrl.includes('/new')) {
      console.log('   ✅ 客戶建立成功，已重定向到列表頁');
    } else {
      console.log(`   ❌ 客戶建立可能失敗，當前 URL: ${currentUrl}`);
    }

    // 4. 測試新增報價單
    console.log('\n4. 測試新增報價單...');
    await page.goto(`${BASE_URL}/zh/quotations/new`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    console.log('   檢查頁面載入...');
    const hasForm = await page.evaluate(() => {
      return !!document.querySelector('form');
    });

    if (hasForm) {
      console.log('   ✅ 報價單表單已載入');

      // 選擇客戶
      console.log('   選擇客戶...');
      const customerSelect = await page.$('select[name="customer_id"]');
      if (customerSelect) {
        const hasOptions = await page.evaluate(() => {
          const select = document.querySelector('select[name="customer_id"]');
          return select && select.options.length > 1;
        });

        if (hasOptions) {
          const firstValue = await page.evaluate(() => {
            const select = document.querySelector('select[name="customer_id"]');
            const option = Array.from(select.options).find(opt => opt.value && opt.value !== '');
            return option ? option.value : null;
          });

          if (firstValue) {
            await page.select('select[name="customer_id"]', firstValue);
            console.log('   ✅ 已選擇客戶');
          }
        } else {
          console.log('   ⚠️  沒有可選的客戶');
        }
      }

      console.log('   點擊建立報價單...');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      const quotationUrl = page.url();
      if (quotationUrl.includes('/quotations/') && !quotationUrl.includes('/new')) {
        console.log('   ✅ 報價單建立成功');
      } else {
        console.log(`   ❌ 報價單建立失敗，當前 URL: ${quotationUrl}`);
      }
    } else {
      console.log('   ❌ 報價單表單未載入');
    }

    console.log('\n=== 測試完成 ===');
    console.log('請查看上方的 API 回應和錯誤訊息');

    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  } finally {
    await browser.close();
  }
}

testFullFlow();
