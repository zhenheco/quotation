import puppeteer from 'puppeteer'

async function testSendQuotation() {
  console.log('=== 使用 Chrome DevTools 測試寄送報價單功能 ===\n')

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--window-size=1920,1080']
  })

  const page = await browser.newPage()

  const requests = []
  const responses = []

  page.on('request', request => {
    if (request.url().includes('/api/quotations') && request.url().includes('/send')) {
      console.log('📤 發送請求:', request.method(), request.url())
      requests.push({
        method: request.method(),
        url: request.url(),
        headers: request.headers(),
        postData: request.postData()
      })
    }
  })

  page.on('response', async response => {
    if (response.url().includes('/api/quotations') && response.url().includes('/send')) {
      console.log('📥 收到回應:', response.status(), response.url())

      try {
        const data = await response.json()
        responses.push({
          status: response.status(),
          url: response.url(),
          data: data
        })
        console.log('回應資料:', JSON.stringify(data, null, 2))
      } catch (e) {
        console.error('解析回應失敗:', e.message)
      }
    }
  })

  page.on('console', msg => {
    const type = msg.type()
    if (type === 'error') {
      console.log('❌ Console Error:', msg.text())
    } else if (type === 'warn') {
      console.log('⚠️  Console Warning:', msg.text())
    }
  })

  try {
    console.log('1️⃣ 訪問首頁...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' })

    console.log('\n2️⃣ 等待頁面載入...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    const currentUrl = page.url()
    console.log('當前 URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('\n⚠️  需要登入，請手動登入後按 Enter 繼續...')
      console.log('提示：')
      console.log('- 帳號: acejou27@gmail.com')
      console.log('- 密碼: [您的密碼]')

      await new Promise(resolve => {
        process.stdin.once('data', () => resolve())
      })
    }

    console.log('\n3️⃣ 導航到報價單列表...')
    await page.goto('http://localhost:3000/zh/quotations', { waitUntil: 'networkidle0' })
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('\n4️⃣ 檢查報價單列表...')

    const quotations = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'))
      return rows.map(row => {
        const cells = Array.from(row.querySelectorAll('td'))
        return {
          number: cells[0]?.textContent?.trim(),
          customer: cells[1]?.textContent?.trim(),
          status: cells[2]?.textContent?.trim(),
          amount: cells[3]?.textContent?.trim()
        }
      })
    })

    console.log('找到的報價單:')
    quotations.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.number} - ${q.customer} - 狀態: ${q.status} - ${q.amount}`)
    })

    console.log('\n5️⃣ 尋找 draft 狀態的報價單...')

    const draftRow = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'))
      const draftRow = rows.find(row => {
        const statusCell = row.querySelector('td:nth-child(3)')
        return statusCell?.textContent?.includes('draft') ||
               statusCell?.textContent?.includes('草稿')
      })

      if (draftRow) {
        const cells = Array.from(draftRow.querySelectorAll('td'))
        return {
          found: true,
          number: cells[0]?.textContent?.trim(),
          customer: cells[1]?.textContent?.trim()
        }
      }
      return { found: false }
    })

    if (!draftRow.found) {
      console.log('❌ 沒有找到 draft 狀態的報價單')
      console.log('請執行: node seed-test-data.mjs 建立測試資料')
      await browser.close()
      return
    }

    console.log(`✅ 找到 draft 報價單: ${draftRow.number} - ${draftRow.customer}`)

    console.log('\n6️⃣ 點擊第一個報價單的「檢視」按鈕...')
    await page.click('tbody tr:first-child a[href*="/quotations/"]')
    await page.waitForNavigation({ waitUntil: 'networkidle0' })
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('\n7️⃣ 檢查詳細頁面的寄送按鈕...')

    const sendButtonInfo = await page.evaluate(() => {
      const sendButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent.includes('寄送報價單') || btn.textContent.includes('Send Quotation'))

      if (sendButton) {
        const styles = window.getComputedStyle(sendButton)
        return {
          found: true,
          text: sendButton.textContent.trim(),
          disabled: sendButton.disabled,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          className: sendButton.className
        }
      }
      return { found: false }
    })

    if (!sendButtonInfo.found) {
      console.log('❌ 找不到寄送報價單按鈕')
      await browser.close()
      return
    }

    console.log('✅ 找到寄送按鈕:')
    console.log('   文字:', sendButtonInfo.text)
    console.log('   Disabled:', sendButtonInfo.disabled)
    console.log('   顏色:', sendButtonInfo.color)
    console.log('   背景色:', sendButtonInfo.backgroundColor)
    console.log('   Class:', sendButtonInfo.className)

    if (sendButtonInfo.disabled) {
      console.log('\n⚠️  寄送按鈕是 disabled 狀態（可能沒有客戶郵件）')
      await browser.close()
      return
    }

    console.log('\n8️⃣ 點擊寄送按鈕...')

    await page.click('button:has-text("寄送報價單"), button:has-text("Send Quotation")')

    await new Promise(resolve => setTimeout(resolve, 500))

    const dialogAppeared = await page.evaluate(() => {
      return !!document.querySelector('[role="dialog"]') ||
             confirm !== window.confirm
    })

    console.log('確認對話框出現:', dialogAppeared ? '✅' : '❌')

    page.once('dialog', async dialog => {
      console.log('\n9️⃣ 確認對話框內容:', dialog.message())
      await dialog.accept()
      console.log('✅ 已點擊確認')
    })

    await new Promise(resolve => setTimeout(resolve, 3000))

    console.log('\n🔍 Network 請求結果:')
    if (requests.length > 0) {
      console.log('\n📤 請求詳情:')
      requests.forEach((req, i) => {
        console.log(`  ${i + 1}. ${req.method} ${req.url}`)
      })
    } else {
      console.log('  ⚠️  沒有捕獲到 /send 請求')
    }

    if (responses.length > 0) {
      console.log('\n📥 回應詳情:')
      responses.forEach((res, i) => {
        console.log(`  ${i + 1}. Status: ${res.status}`)
        console.log(`     Success: ${res.data.success}`)
        console.log(`     Message: ${res.data.message}`)
        if (res.data.data) {
          console.log(`     Status: ${res.data.data.status}`)
        }
      })
    } else {
      console.log('  ⚠️  沒有捕獲到回應')
    }

    console.log('\n🔍 檢查頁面上的通知訊息...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    const toastMessages = await page.evaluate(() => {
      const toasts = Array.from(document.querySelectorAll('[role="status"], .toast, [data-sonner-toast]'))
      return toasts.map(t => t.textContent?.trim())
    })

    if (toastMessages.length > 0) {
      console.log('通知訊息:', toastMessages)
    } else {
      console.log('⚠️  沒有找到通知訊息')
    }

    console.log('\n✅ 測試完成！')
    console.log('\n按 Enter 關閉瀏覽器...')

    await new Promise(resolve => {
      process.stdin.once('data', () => resolve())
    })

  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message)
    console.error(error.stack)
  } finally {
    await browser.close()
  }
}

testSendQuotation()
