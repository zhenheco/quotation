import puppeteer from 'puppeteer'

const BASE_URL = 'http://localhost:3001'

interface TestResult {
  name: string
  passed: boolean
  error?: string
  screenshot?: string
}

async function testPage(browser: puppeteer.Browser, url: string, testName: string, tests: (page: puppeteer.Page) => Promise<void>): Promise<TestResult> {
  const page = await browser.newPage()

  try {
    await page.goto(url, { waitUntil: 'networkidle0' })
    await tests(page)

    const screenshotPath = `test-results/${testName.replace(/\s+/g, '-')}.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })

    return {
      name: testName,
      passed: true,
      screenshot: screenshotPath
    }
  } catch (error) {
    const screenshotPath = `test-results/${testName.replace(/\s+/g, '-')}-FAILED.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })

    return {
      name: testName,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      screenshot: screenshotPath
    }
  } finally {
    await page.close()
  }
}

async function runTests() {
  console.log('🚀 開始 Email 認證系統測試\n')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const results: TestResult[] = []

  results.push(await testPage(browser, `${BASE_URL}/login`, '登入頁面載入', async (page) => {
    const title = await page.$('h1')
    if (!title) throw new Error('找不到標題')
    const text = await page.evaluate(el => el?.textContent, title)
    if (!text?.includes('報價單系統')) throw new Error(`標題不正確: ${text}`)
  }))

  results.push(await testPage(browser, `${BASE_URL}/login`, 'Email 登入表單顯示', async (page) => {
    const emailInput = await page.$('input[type="email"]')
    const passwordInput = await page.$('input[type="password"]')
    if (!emailInput) throw new Error('找不到 Email 輸入框')
    if (!passwordInput) throw new Error('找不到密碼輸入框')
  }))

  results.push(await testPage(browser, `${BASE_URL}/login`, 'Tab 切換功能', async (page) => {
    const buttons = await page.$$('button')
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button)
      if (text?.includes('Email 登入')) {
        await button.click()
        break
      }
    }
    await page.waitForSelector('input[type="email"]', { visible: true })

    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button)
      if (text?.includes('Google 登入')) {
        await button.click()
        break
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }))

  results.push(await testPage(browser, `${BASE_URL}/register`, '註冊頁面載入', async (page) => {
    const title = await page.$('h1')
    if (!title) throw new Error('找不到標題')
    const text = await page.evaluate(el => el?.textContent, title)
    if (!text?.includes('註冊')) throw new Error('標題不正確')
  }))

  results.push(await testPage(browser, `${BASE_URL}/register`, '密碼強度指示器', async (page) => {
    const passwordInput = await page.$('input[type="password"]')
    if (!passwordInput) throw new Error('找不到密碼輸入框')

    await passwordInput.type('weak')
    await new Promise(resolve => setTimeout(resolve, 500))

    await passwordInput.click({ clickCount: 3 })
    await passwordInput.type('StrongPass123!')
    await new Promise(resolve => setTimeout(resolve, 500))
  }))

  results.push(await testPage(browser, `${BASE_URL}/reset-password`, '密碼重設頁面載入', async (page) => {
    const title = await page.$('h1')
    if (!title) throw new Error('找不到標題')
    const emailInput = await page.$('input[type="email"]')
    if (!emailInput) throw new Error('找不到 Email 輸入框')
  }))

  // 測試 /en/login 301 重定向到 /login
  results.push(await testPage(browser, `${BASE_URL}/en/login`, '舊路徑 301 重定向', async (page) => {
    // 由於 next.config.ts 有 301 重定向，/en/login 會重定向到 /login
    const url = page.url()
    if (!url.includes('/login')) throw new Error(`重定向失敗，當前 URL: ${url}`)
  }))

  results.push(await testPage(browser, `${BASE_URL}/login?registered=true`, '註冊成功提示', async (page) => {
    const content = await page.content()
    if (!content.includes('註冊成功') && !content.includes('請確認')) {
      throw new Error('找不到註冊成功提示')
    }
  }))

  results.push(await testPage(browser, `${BASE_URL}/login`, '響應式設計 - 手機', async (page) => {
    await page.setViewport({ width: 375, height: 667 })
    await page.reload({ waitUntil: 'networkidle0' })
    const title = await page.$('h1')
    if (!title) throw new Error('手機視窗無法顯示標題')
  }))

  results.push(await testPage(browser, `${BASE_URL}/login`, '響應式設計 - 平板', async (page) => {
    await page.setViewport({ width: 768, height: 1024 })
    await page.reload({ waitUntil: 'networkidle0' })
    const title = await page.$('h1')
    if (!title) throw new Error('平板視窗無法顯示標題')
  }))

  await browser.close()

  console.log('\n' + '='.repeat(60))
  console.log('📊 測試結果總結')
  console.log('='.repeat(60) + '\n')

  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length

  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${index + 1}. ${status} ${result.name}`)
    if (result.error) {
      console.log(`   錯誤: ${result.error}`)
    }
    console.log(`   截圖: ${result.screenshot}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log(`總計: ${results.length} 個測試`)
  console.log(`✅ 通過: ${passed}`)
  console.log(`❌ 失敗: ${failed}`)
  console.log(`成功率: ${((passed / results.length) * 100).toFixed(1)}%`)
  console.log('='.repeat(60) + '\n')

  if (failed > 0) {
    console.error('❌ 測試未全部通過，請檢查失敗的測試項目')
    process.exit(1)
  } else {
    console.log('✅ 所有測試通過！')
    process.exit(0)
  }
}

runTests().catch(error => {
  console.error('❌ 測試執行失敗:', error)
  process.exit(1)
})
