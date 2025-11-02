import puppeteer from 'puppeteer';

const SITE_URL = 'https://quotation.zhenhe-dm.com';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testQuotationSystem() {
  console.log('🚀 開始完整測試報價單系統...\n');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--window-size=1920,1080', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleLogs = [];
  const errors = [];
  const networkRequests = [];

  page.on('console', msg => {
    const logEntry = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(logEntry);
    const emoji = msg.type() === 'error' ? '❌' : msg.type() === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} Console: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    const errorMsg = `Page Error: ${error.message}`;
    errors.push(errorMsg);
    console.error('❌ ' + errorMsg);
  });

  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/quotations')) {
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';

      let body = null;
      try {
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          const text = await response.text();
          body = text.substring(0, 200);
        }
      } catch (e) {
        body = 'Failed to read response';
      }

      const request = {
        url,
        method: response.request().method(),
        status,
        contentType,
        body
      };
      networkRequests.push(request);

      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${emoji} ${request.method} ${url} - ${status}`);
      if (status >= 400) {
        console.log(`   Response: ${JSON.stringify(body, null, 2)}`);
      }
    }
  });

  try {
    // 步驟 1: 登入
    console.log('\n📝 步驟 1: 登入系統...');
    await page.goto(`${SITE_URL}/zh/login`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });

    console.log('✅ 登入成功\n');
    await sleep(2000);

    // 步驟 2: 導航至報價單列表
    console.log('📋 步驟 2: 前往報價單列表...');
    await page.goto(`${SITE_URL}/zh/quotations`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('✅ 報價單列表載入完成\n');
    await sleep(3000);

    // 步驟 3: 檢查 API 回應是否包含 customer_email
    console.log('🔍 步驟 3: 檢查 API 回應...');

    const apiRequests = networkRequests.filter(r =>
      r.url.includes('/api/quotations') &&
      !r.url.includes('/send') &&
      r.method === 'GET'
    );

    if (apiRequests.length > 0) {
      const lastRequest = apiRequests[apiRequests.length - 1];
      console.log(`   最後一個 GET 請求: ${lastRequest.url}`);
      console.log(`   狀態碼: ${lastRequest.status}`);

      if (lastRequest.body && typeof lastRequest.body === 'object') {
        const hasCustomerEmail = lastRequest.body.customer_email !== undefined;
        console.log(`   customer_email 欄位: ${hasCustomerEmail ? '✅ 存在' : '❌ 不存在'}`);
        if (hasCustomerEmail) {
          console.log(`   customer_email 值: ${lastRequest.body.customer_email || '(空)'}`);
        }
      }
    }
    console.log();

    // 步驟 4: 檢查綠色寄送按鈕狀態
    console.log('🔘 步驟 4: 檢查寄送按鈕狀態...');

    const sendButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      return buttons
        .filter(btn => {
          const text = btn.textContent || '';
          return text.includes('寄送') || text.includes('發送') || text.includes('send');
        })
        .map(btn => ({
          text: btn.textContent.trim(),
          disabled: btn.disabled || btn.hasAttribute('disabled'),
          className: btn.className,
          title: btn.title || btn.getAttribute('title')
        }));
    });

    console.log(`   找到 ${sendButtons.length} 個寄送按鈕:`);
    sendButtons.forEach((btn, idx) => {
      const status = btn.disabled ? '🔒 已禁用' : '✅ 可點擊';
      console.log(`   按鈕 ${idx + 1}: "${btn.text}" - ${status}`);
      if (btn.title) {
        console.log(`     提示: ${btn.title}`);
      }
    });
    console.log();

    // 步驟 5: 擷取截圖
    console.log('📸 步驟 5: 擷取截圖...');
    await page.screenshot({
      path: 'test-result-quotation-list.png',
      fullPage: true
    });
    console.log('✅ 截圖已儲存: test-result-quotation-list.png\n');

    // 步驟 6: 測試報價單詳情頁面
    console.log('📄 步驟 6: 測試報價單詳情頁面...');

    const firstQuotationLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const quotationLink = links.find(link =>
        link.href.includes('/quotations/') &&
        !link.href.includes('/new') &&
        !link.href.includes('/edit')
      );
      return quotationLink ? quotationLink.href : null;
    });

    if (firstQuotationLink) {
      console.log(`   導航至: ${firstQuotationLink}`);
      await page.goto(firstQuotationLink, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await sleep(2000);

      console.log('✅ 報價單詳情頁載入完成');

      await page.screenshot({
        path: 'test-result-quotation-detail.png',
        fullPage: true
      });
      console.log('✅ 詳情頁截圖已儲存\n');
    } else {
      console.log('⚠️  找不到報價單連結\n');
    }

    // 步驟 7: 生成測試報告
    console.log('📊 步驟 7: 生成測試報告...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalConsoleMessages: consoleLogs.length,
        totalErrors: errors.length,
        totalApiRequests: networkRequests.length
      },
      consoleLogs,
      errors,
      apiRequests: networkRequests,
      sendButtonsStatus: sendButtons
    };

    const reportPath = 'test-report.json';
    await import('fs').then(fs => {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    });
    console.log(`✅ 測試報告已儲存: ${reportPath}\n`);

    // 最終總結
    console.log('═══════════════════════════════════════');
    console.log('📋 測試總結');
    console.log('═══════════════════════════════════════');
    console.log(`Console 訊息: ${consoleLogs.length} 條`);
    console.log(`錯誤訊息: ${errors.length} 個`);
    console.log(`API 請求: ${networkRequests.length} 個`);

    const apiErrors = networkRequests.filter(r => r.status >= 400);
    if (apiErrors.length > 0) {
      console.log(`\n❌ 發現 ${apiErrors.length} 個失敗的 API 請求:`);
      apiErrors.forEach(r => {
        console.log(`   - ${r.method} ${r.url} (${r.status})`);
      });
    } else {
      console.log('\n✅ 所有 API 請求都成功');
    }

    const disabledButtons = sendButtons.filter(b => b.disabled);
    if (disabledButtons.length > 0) {
      console.log(`\n⚠️  發現 ${disabledButtons.length} 個被禁用的寄送按鈕`);
    } else {
      console.log('\n✅ 所有寄送按鈕都可點擊');
    }

    console.log('═══════════════════════════════════════\n');

    console.log('⏳ 保持瀏覽器開啟 30 秒以供檢查...');
    await sleep(30000);

  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    console.error('Stack:', error.stack);

    await page.screenshot({
      path: 'test-error.png',
      fullPage: true
    });
    console.log('📸 錯誤截圖已儲存: test-error.png');

    throw error;
  } finally {
    console.log('\n🔚 關閉瀏覽器...');
    await browser.close();
    console.log('✅ 測試完成');
  }
}

testQuotationSystem().catch(error => {
  console.error('測試執行失敗:', error);
  process.exit(1);
});
