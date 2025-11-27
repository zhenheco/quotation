import puppeteer from 'puppeteer';

const SITE_URL = 'https://quote24.cc';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';
const TEST_QUOTATION_ID = '3d9ea7c9-11f1-436e-88c8-4f80515c69bb';

async function debugSendQuotation() {
  console.log('🔍 開始診斷報價單寄送功能...\n');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // 監聽所有 console 訊息
  page.on('console', msg => {
    const type = msg.type();
    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [Browser Console] ${msg.text()}`);
  });

  // 監聽頁面錯誤
  page.on('pageerror', error => {
    console.error('❌ [Page Error]', error.message);
  });

  // 監聽所有網路請求
  const apiRequests = [];
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';

      let body = null;
      try {
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          const text = await response.text();
          body = text.substring(0, 500);
        }
      } catch (e) {
        body = `Failed to read: ${e.message}`;
      }

      const request = {
        url,
        method: response.request().method(),
        status,
        contentType,
        body
      };
      apiRequests.push(request);

      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`${emoji} ${request.method} ${url}`);
      console.log(`   Status: ${status}`);
      console.log(`   Content-Type: ${contentType}`);

      if (status >= 400 || !contentType.includes('application/json')) {
        console.log(`   Body: ${JSON.stringify(body, null, 2)}`);
      }
    }
  });

  try {
    // 步驟 1: 登入
    console.log('\n📝 步驟 1: 登入系統...');
    await page.goto(`${SITE_URL}/zh/login`, { waitUntil: 'networkidle0' });

    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ 登入成功\n');

    // 步驟 2: 前往報價單詳情頁
    console.log('📄 步驟 2: 前往報價單詳情頁...');
    const detailUrl = `${SITE_URL}/zh/quotations/${TEST_QUOTATION_ID}`;
    await page.goto(detailUrl, { waitUntil: 'networkidle0' });
    console.log('✅ 報價單詳情頁載入完成\n');

    await page.waitForTimeout(2000);

    // 步驟 3: 檢查頁面上的 customer_email
    console.log('🔍 步驟 3: 檢查頁面資料...');
    const pageData = await page.evaluate(() => {
      // 嘗試從各種可能的地方獲取資料
      const data = {
        title: document.title,
        hasReactRoot: !!document.querySelector('#__next'),
        windowData: window.__NEXT_DATA__ ? 'exists' : 'missing'
      };
      return data;
    });
    console.log('   頁面資料:', JSON.stringify(pageData, null, 2));

    // 步驟 4: 查找並點擊寄送按鈕
    console.log('\n🔘 步驟 4: 查找寄送按鈕...');

    // 等待寄送按鈕出現
    await page.waitForTimeout(1000);

    const sendButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const sendBtn = buttons.find(btn =>
        btn.textContent.includes('寄送') ||
        btn.textContent.includes('Send') ||
        btn.textContent.includes('send')
      );

      if (sendBtn) {
        return {
          text: sendBtn.textContent.trim(),
          disabled: sendBtn.disabled,
          className: sendBtn.className
        };
      }
      return null;
    });

    if (sendButton) {
      console.log('   找到寄送按鈕:', JSON.stringify(sendButton, null, 2));

      if (!sendButton.disabled) {
        console.log('\n🚀 步驟 5: 點擊寄送按鈕...');

        // 點擊寄送按鈕
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const sendBtn = buttons.find(btn =>
            btn.textContent.includes('寄送') ||
            btn.textContent.includes('Send')
          );
          if (sendBtn) {
            sendBtn.click();
          }
        });

        // 等待確認對話框
        await page.waitForTimeout(500);

        // 檢查是否有確認對話框
        const hasDialog = await page.evaluate(() => {
          return !!document.querySelector('[role="dialog"], [role="alertdialog"]');
        });

        if (hasDialog) {
          console.log('   ✅ 確認對話框出現');

          // 擷取對話框內容
          const dialogContent = await page.evaluate(() => {
            const dialog = document.querySelector('[role="dialog"], [role="alertdialog"]');
            return dialog ? dialog.textContent : null;
          });
          console.log('   對話框內容:', dialogContent);

          // 查找並點擊確認按鈕
          await page.waitForTimeout(500);
          await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const confirmBtn = buttons.find(btn =>
              btn.textContent.includes('確認') ||
              btn.textContent.includes('Confirm') ||
              btn.textContent.includes('是') ||
              btn.textContent.includes('Yes')
            );
            if (confirmBtn) {
              console.log('Clicking confirm button...');
              confirmBtn.click();
            }
          });

          console.log('   ⏳ 等待 API 回應...');
          await page.waitForTimeout(3000);

          // 檢查 API 請求結果
          const sendRequest = apiRequests.find(r => r.url.includes('/send'));
          if (sendRequest) {
            console.log('\n📊 Send API 請求結果:');
            console.log(JSON.stringify(sendRequest, null, 2));
          } else {
            console.log('\n⚠️  沒有發現 /send API 請求');
          }

        } else {
          console.log('   ⚠️  沒有出現確認對話框');
        }

      } else {
        console.log('   ⚠️  寄送按鈕被禁用');
      }
    } else {
      console.log('   ❌ 找不到寄送按鈕');
    }

    // 最終報告
    console.log('\n═══════════════════════════════════════');
    console.log('📊 所有 API 請求:');
    console.log('═══════════════════════════════════════');
    apiRequests.forEach(req => {
      console.log(`\n${req.method} ${req.url}`);
      console.log(`Status: ${req.status}`);
      console.log(`Content-Type: ${req.contentType}`);
      if (req.status >= 400) {
        console.log(`Body: ${JSON.stringify(req.body, null, 2)}`);
      }
    });

    console.log('\n⏳ 保持瀏覽器開啟 60 秒以供檢查...');
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    console.error('Stack:', error.stack);

    await page.screenshot({
      path: 'test-send-debug-error.png',
      fullPage: true
    });
    console.log('📸 錯誤截圖已儲存');

  } finally {
    console.log('\n🔚 關閉瀏覽器...');
    await browser.close();
  }
}

debugSendQuotation().catch(error => {
  console.error('執行失敗:', error);
  process.exit(1);
});
