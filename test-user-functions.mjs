import puppeteer from 'puppeteer';

const BASE_URL = 'https://quotation.zhenhe-dm.com';
const EMAIL = 'acejou27@gmail.com';
const PASSWORD = 'Aa090116';

async function testUserFunctions() {
  console.log('=== 測試用戶功能（產品、客戶、報價單）===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 收集所有 API 呼叫
  const apiCalls = [];

  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const method = response.request().method();

    if (url.includes('/api/')) {
      const logEntry = {
        time: new Date().toISOString(),
        method,
        url: url.replace(BASE_URL, ''),
        status
      };

      try {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.includes('application/json')) {
          logEntry.response = await response.json();
        }
      } catch (e) {
        // Response might not be JSON
      }

      apiCalls.push(logEntry);

      if (status >= 400) {
        console.log(`\n❌ API 錯誤: ${method} ${logEntry.url}`);
        console.log(`   Status: ${status}`);
        if (logEntry.response) {
          console.log(`   Response:`, JSON.stringify(logEntry.response, null, 2));
        }
      } else if (status === 200 || status === 201) {
        console.log(`\n✅ API 成功: ${method} ${logEntry.url}`);
        console.log(`   Status: ${status}`);
      }
    }
  });

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' && !text.includes('favicon')) {
      console.log(`\n🔴 Console Error: ${text}`);
    }
  });

  try {
    // 1. 登入
    console.log('1. 登入...');
    await page.goto(`${BASE_URL}/zh/login`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // 查找登入表單的實際選擇器
    const emailInput = await page.evaluateHandle(() => {
      // 嘗試多種方式找到 email 輸入框
      return document.querySelector('input[type="email"]') ||
             document.querySelector('input[id*="email"]') ||
             document.querySelector('input[placeholder*="email"]') ||
             document.querySelector('input[placeholder*="Email"]') ||
             document.querySelector('input[placeholder*="電子郵件"]');
    });

    const passwordInput = await page.evaluateHandle(() => {
      return document.querySelector('input[type="password"]') ||
             document.querySelector('input[id*="password"]') ||
             document.querySelector('input[placeholder*="password"]') ||
             document.querySelector('input[placeholder*="Password"]') ||
             document.querySelector('input[placeholder*="密碼"]');
    });

    if (!emailInput || !passwordInput) {
      console.log('❌ 找不到登入表單');
      return;
    }

    await emailInput.asElement().type(EMAIL);
    await passwordInput.asElement().type(PASSWORD);

    // 尋找提交按鈕
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button'))
        .find(btn =>
          btn.textContent.includes('登入') ||
          btn.textContent.includes('Login') ||
          btn.type === 'submit'
        );
      if (button) button.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✅ 登入成功\n');

    // 2. 測試產品編輯
    console.log('2. 測試產品價格編輯...');
    await page.goto(`${BASE_URL}/zh/products`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    const productLinks = await page.$$('a[href*="/products/"]');
    if (productLinks.length > 0) {
      const firstProductHref = await page.evaluate(el => el.href, productLinks[0]);
      console.log(`   導航到產品編輯頁: ${firstProductHref}`);

      await page.goto(firstProductHref, { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000);

      // 取得當前價格
      const currentPrice = await page.evaluate(() => {
        const input = document.querySelector('input[name="unit_price"]') ||
                     document.querySelector('input[id*="price"]');
        return input ? input.value : null;
      });
      console.log(`   當前價格: ${currentPrice}`);

      // 修改價格
      const testPrice = '888.88';
      await page.evaluate((price) => {
        const input = document.querySelector('input[name="unit_price"]') ||
                     document.querySelector('input[id*="price"]');
        if (input) {
          input.value = price;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, testPrice);
      console.log(`   修改價格為: ${testPrice}`);

      await page.waitForTimeout(500);

      // 點擊儲存按鈕
      const saved = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const saveBtn = buttons.find(btn =>
          btn.textContent.includes('儲存') ||
          btn.textContent.includes('保存') ||
          btn.textContent.includes('Save') ||
          btn.type === 'submit'
        );
        if (saveBtn) {
          saveBtn.click();
          return true;
        }
        return false;
      });

      if (saved) {
        console.log('   點擊儲存按鈕');
        await page.waitForTimeout(3000);

        // 重新載入頁面檢查
        await page.reload({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);

        const newPrice = await page.evaluate(() => {
          const input = document.querySelector('input[name="unit_price"]') ||
                       document.querySelector('input[id*="price"]');
          return input ? input.value : null;
        });

        console.log(`   重新載入後的價格: ${newPrice}`);
        if (newPrice === testPrice) {
          console.log('   ✅ 產品價格儲存成功！');
        } else {
          console.log(`   ❌ 產品價格未正確儲存！預期 ${testPrice}，實際 ${newPrice}`);
        }
      } else {
        console.log('   ❌ 找不到儲存按鈕');
      }
    } else {
      console.log('   ⚠️  沒有產品可測試');
    }

    // 3. 測試新增客戶
    console.log('\n3. 測試新增客戶...');
    await page.goto(`${BASE_URL}/zh/customers/new`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(1000);

    const timestamp = Date.now();
    const testName = `測試客戶${timestamp}`;
    const testEmail = `test${timestamp}@example.com`;

    console.log(`   填寫客戶資訊: ${testName}`);

    await page.evaluate((name, email) => {
      const nameInput = document.querySelector('input[name="name"]') ||
                       document.querySelector('input[id*="name"]');
      const emailInput = document.querySelector('input[name="email"]') ||
                        document.querySelector('input[type="email"]');

      if (nameInput) {
        nameInput.value = name;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (emailInput) {
        emailInput.value = email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, testName, testEmail);

    await page.waitForTimeout(500);

    // 點擊建立按鈕
    const created = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const createBtn = buttons.find(btn =>
        btn.textContent.includes('建立') ||
        btn.textContent.includes('創建') ||
        btn.textContent.includes('Create') ||
        btn.type === 'submit'
      );
      if (createBtn) {
        createBtn.click();
        return true;
      }
      return false;
    });

    if (created) {
      console.log('   點擊建立按鈕');
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      if (currentUrl.includes('/customers') && !currentUrl.includes('/new')) {
        console.log('   ✅ 客戶建立成功，已重定向到列表頁');
      } else {
        console.log(`   ❌ 客戶建立可能失敗，當前 URL: ${currentUrl}`);
      }
    } else {
      console.log('   ❌ 找不到建立按鈕');
    }

    // 4. 測試新增報價單
    console.log('\n4. 測試新增報價單...');
    await page.goto(`${BASE_URL}/zh/quotations/new`, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // 選擇客戶
    const customerSelected = await page.evaluate(() => {
      const select = document.querySelector('select[name="customer_id"]') ||
                    document.querySelector('select');
      if (select && select.options.length > 1) {
        const option = Array.from(select.options).find(opt => opt.value && opt.value !== '');
        if (option) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      return false;
    });

    if (customerSelected) {
      console.log('   ✅ 已選擇客戶');
      await page.waitForTimeout(500);

      // 點擊建立報價單按鈕
      const quotationCreated = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(btn =>
          btn.textContent.includes('建立') ||
          btn.textContent.includes('創建') ||
          btn.textContent.includes('Create') ||
          btn.type === 'submit'
        );
        if (createBtn) {
          createBtn.click();
          return true;
        }
        return false;
      });

      if (quotationCreated) {
        console.log('   點擊建立報價單按鈕');
        await page.waitForTimeout(3000);

        const quotationUrl = page.url();
        if (quotationUrl.includes('/quotations/') && !quotationUrl.includes('/new')) {
          console.log('   ✅ 報價單建立成功');
        } else {
          console.log(`   ❌ 報價單建立失敗，當前 URL: ${quotationUrl}`);
        }
      } else {
        console.log('   ❌ 找不到建立報價單按鈕');
      }
    } else {
      console.log('   ⚠️  沒有可選的客戶');
    }

    console.log('\n=== 測試完成 ===');
    console.log(`\n總共捕獲 ${apiCalls.length} 個 API 呼叫`);

    // 顯示所有失敗的 API
    const failedCalls = apiCalls.filter(call => call.status >= 400);
    if (failedCalls.length > 0) {
      console.log(`\n❌ 失敗的 API 呼叫 (${failedCalls.length}):`);
      failedCalls.forEach(call => {
        console.log(`  ${call.method} ${call.url} - ${call.status}`);
        if (call.response) {
          console.log(`    ${JSON.stringify(call.response)}`);
        }
      });
    }

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testUserFunctions();
