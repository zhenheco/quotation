import puppeteer from 'puppeteer';

const CF_URL = 'https://quote24.cc';

async function testSendQuotation() {
  console.log('🚀 啟動 Chrome DevTools 測試...\n');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();

  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} Console ${type}: ${text}`);
  });

  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });

  page.on('requestfailed', request => {
    console.error('❌ Request Failed:', request.url(), request.failure().errorText);
  });

  try {
    console.log('📱 導航至登入頁面...');
    await page.goto(`${CF_URL}/zh/login`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('✅ 登入頁面載入完成');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📝 填寫登入表單...');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password123');

    console.log('🔐 提交登入...');
    await page.click('button[type="submit"]');

    await page.waitForNavigation({
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('✅ 登入成功');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📋 導航至報價單列表...');
    await page.goto(`${CF_URL}/zh/quotations`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('✅ 報價單列表載入完成');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n🔍 檢查綠色寄送按鈕狀態...');

    const sendButtons = await page.$$('button:has-text("寄送"), a:has-text("寄送")');

    if (sendButtons.length === 0) {
      console.log('⚠️  找不到寄送按鈕，嘗試其他選擇器...');

      const allButtons = await page.$$('button');
      for (const button of allButtons) {
        const text = await page.evaluate(el => el.textContent, button);
        const isDisabled = await page.evaluate(el => el.disabled, button);
        const className = await page.evaluate(el => el.className, button);

        if (text.includes('寄送') || text.includes('發送') || text.includes('send')) {
          console.log(`  找到按鈕: "${text}"`);
          console.log(`    - disabled: ${isDisabled}`);
          console.log(`    - className: ${className}`);
        }
      }
    }

    console.log('\n📸 擷取截圖...');
    await page.screenshot({
      path: 'quotation-list-cf.png',
      fullPage: true
    });
    console.log('✅ 截圖已儲存: quotation-list-cf.png');

    console.log('\n🧪 測試寄送 API (直接呼叫)...');

    const response = await page.evaluate(async (baseUrl) => {
      try {
        const res = await fetch(`${baseUrl}/api/quotations/3d9ea7c9-11f1-436e-88c8-4f80515c69bb/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const contentType = res.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          data = { error: 'Non-JSON response', body: text.substring(0, 200) };
        }

        return {
          status: res.status,
          statusText: res.statusText,
          contentType,
          data
        };
      } catch (error) {
        return {
          error: error.message,
          stack: error.stack
        };
      }
    }, CF_URL);

    console.log('\n📊 API 回應結果:');
    console.log(JSON.stringify(response, null, 2));

    if (response.status === 500) {
      console.log('\n❌ API 回傳 500 錯誤');
      console.log('錯誤詳情:', response.data);
    } else if (response.status === 200) {
      console.log('\n✅ API 呼叫成功');
    } else {
      console.log(`\n⚠️  API 回傳狀態: ${response.status}`);
    }

    console.log('\n⏳ 保持瀏覽器開啟以供檢查 (30秒)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    console.error('Stack:', error.stack);

    await page.screenshot({
      path: 'error-screenshot.png',
      fullPage: true
    });
    console.log('📸 錯誤截圖已儲存: error-screenshot.png');
  } finally {
    console.log('\n🔚 關閉瀏覽器...');
    await browser.close();
  }
}

testSendQuotation().catch(console.error);
