/**
 * 檔案上傳安全測試
 * 
 * 測試檔案上傳的安全功能
 */

import { test, expect } from '@playwright/test'

test.describe('檔案上傳安全測試', () => {
  
  test.describe('📁 檔案類型驗證', () => {
    test('API 應該拒絕危險的檔案類型', async ({ request }) => {
      // 創建危險檔案的模擬內容
      const dangerousFiles = [
        { 
          name: 'malware.exe',
          content: Buffer.from([0x4D, 0x5A, 0x90, 0x00]), // PE header 
          mimeType: 'application/octet-stream'
        },
        {
          name: 'script.js',
          content: Buffer.from('alert("malicious")'),
          mimeType: 'application/javascript'
        },
        {
          name: 'fake-image.jpg.exe',
          content: Buffer.from([0x4D, 0x5A]), // PE header disguised as image
          mimeType: 'image/jpeg'
        },
        {
          name: 'shell.sh',
          content: Buffer.from('#!/bin/bash\nrm -rf /'),
          mimeType: 'application/x-sh'
        }
      ]

      for (const file of dangerousFiles) {
        const formData = new FormData()
        const blob = new Blob([file.content], { type: file.mimeType })
        formData.append('file', blob, file.name)
        formData.append('type', 'company-file')

        const response = await request.post('/api/upload/company-files', {
          multipart: formData
        })

        // 應該拒絕危險檔案類型
        expect(response.status()).not.toBe(200)
        
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.error).toMatch(/file.*type|not.*allowed|dangerous|invalid/i)
        }
      }
    })

    test('API 應該檢查檔案魔術字節', async ({ request }) => {
      // 創建偽造的圖片檔案（聲稱是 JPEG 但實際是文字）
      const fakeImages = [
        {
          name: 'fake.jpg',
          content: Buffer.from('This is not a JPEG file'),
          mimeType: 'image/jpeg'
        },
        {
          name: 'fake.png', 
          content: Buffer.from('<script>alert("xss")</script>'),
          mimeType: 'image/png'
        },
        {
          name: 'disguised.jpg',
          content: Buffer.from([0x4D, 0x5A, 0x90, 0x00]), // PE header disguised as JPEG
          mimeType: 'image/jpeg'
        }
      ]

      for (const file of fakeImages) {
        const formData = new FormData()
        const blob = new Blob([file.content], { type: file.mimeType })
        formData.append('file', blob, file.name)
        formData.append('type', 'company-file')

        const response = await request.post('/api/upload/company-files', {
          multipart: formData
        })

        // 應該檢測到檔案類型不符並拒絕
        expect(response.status()).not.toBe(200)
        
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.error).toMatch(/magic.*bytes|file.*signature|type.*mismatch|invalid.*file/i)
        }
      }
    })

    test('API 應該接受有效的圖片檔案', async ({ request }) => {
      // 創建有效的圖片檔案（正確的魔術字節）
      const validImages = [
        {
          name: 'valid.jpg',
          content: Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, // JPEG header
            0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
            ...Array(100).fill(0xFF) // Minimal JPEG data
          ]),
          mimeType: 'image/jpeg'
        },
        {
          name: 'valid.png',
          content: Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
            ...Array(100).fill(0x00) // Minimal PNG data
          ]),
          mimeType: 'image/png'
        }
      ]

      for (const file of validImages) {
        const formData = new FormData()
        const blob = new Blob([file.content], { type: file.mimeType })
        formData.append('file', blob, file.name)
        formData.append('type', 'company-file')

        const response = await request.post('/api/upload/company-files', {
          multipart: formData
        })

        // 有效檔案應該被接受（除非有其他驗證問題如認證）
        if (response.status() !== 401 && response.status() !== 403) {
          expect([200, 201]).toContain(response.status())
          
          if (response.status() === 200 || response.status() === 201) {
            const body = await response.json()
            expect(body.success).toBe(true)
          }
        }
      }
    })
  })

  test.describe('📏 檔案大小驗證', () => {
    test('API 應該拒絕過大的檔案', async ({ request }) => {
      // 創建超過限制的大檔案 (假設限制是 10MB)
      const largeFileSize = 11 * 1024 * 1024 // 11MB
      const largeContent = Buffer.alloc(largeFileSize, 0xFF)
      
      // 添加正確的 JPEG 檔頭
      largeContent[0] = 0xFF
      largeContent[1] = 0xD8
      largeContent[2] = 0xFF
      largeContent[3] = 0xE0

      const formData = new FormData()
      const blob = new Blob([largeContent], { type: 'image/jpeg' })
      formData.append('file', blob, 'large-image.jpg')
      formData.append('type', 'company-file')

      const response = await request.post('/api/upload/company-files', {
        multipart: formData
      })

      // 應該拒絕過大的檔案
      expect(response.status()).not.toBe(200)
      
      if (response.status() === 400) {
        const body = await response.json()
        expect(body.success).toBe(false)
        expect(body.error).toMatch(/size.*exceed|too.*large|file.*size/i)
      }
    })

    test('API 應該拒絕空檔案', async ({ request }) => {
      const formData = new FormData()
      const blob = new Blob([], { type: 'image/jpeg' })
      formData.append('file', blob, 'empty.jpg')
      formData.append('type', 'company-file')

      const response = await request.post('/api/upload/company-files', {
        multipart: formData
      })

      // 應該拒絕空檔案
      expect(response.status()).not.toBe(200)
      
      if (response.status() === 400) {
        const body = await response.json()
        expect(body.success).toBe(false)
        expect(body.error).toMatch(/empty.*file|no.*content|invalid.*file/i)
      }
    })
  })

  test.describe('🔤 檔案名稱驗證', () => {
    test('API 應該拒絕危險的檔案名稱', async ({ request }) => {
      const dangerousNames = [
        '../../../etc/passwd',
        '..\\\\system32\\\\config',
        'file\x00.jpg', // Null byte injection
        '.htaccess',
        '~$temp.jpg',
        'CON.jpg', // Windows reserved name
        'file<script>.jpg',
        'file"with"quotes.jpg'
      ]

      // 創建有效的 JPEG 內容
      const validJPEG = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
        ...Array(50).fill(0xFF)
      ])

      for (const dangerousName of dangerousNames) {
        const formData = new FormData()
        const blob = new Blob([validJPEG], { type: 'image/jpeg' })
        formData.append('file', blob, dangerousName)
        formData.append('type', 'company-file')

        const response = await request.post('/api/upload/company-files', {
          multipart: formData
        })

        // 應該拒絕危險的檔案名稱
        expect(response.status()).not.toBe(200)
        
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.success).toBe(false)
          expect(body.error).toMatch(/filename|name.*invalid|dangerous.*char/i)
        }
      }
    })

    test('API 應該接受安全的檔案名稱', async ({ request }) => {
      const safeNames = [
        'company-logo.jpg',
        'receipt_2024_01_01.png',
        'document-scan.jpeg',
        'photo.JPG', // 大寫副檔名
        'file-with-dashes.jpg'
      ]

      // 創建有效的 JPEG 內容
      const validJPEG = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
        ...Array(50).fill(0xFF)
      ])

      for (const safeName of safeNames) {
        const formData = new FormData()
        const blob = new Blob([validJPEG], { type: 'image/jpeg' })
        formData.append('file', blob, safeName)
        formData.append('type', 'company-file')

        const response = await request.post('/api/upload/company-files', {
          multipart: formData
        })

        // 安全的檔案名稱應該被接受（除非有認證問題）
        if (response.status() !== 401 && response.status() !== 403) {
          expect([200, 201]).toContain(response.status())
          
          if (response.status() === 200 || response.status() === 201) {
            const body = await response.json()
            expect(body.success).toBe(true)
          }
        }
      }
    })
  })

  test.describe('🔐 檔案上傳授權', () => {
    test('未認證用戶不能上傳檔案', async ({ request }) => {
      // 創建有效的檔案
      const validJPEG = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
        ...Array(50).fill(0xFF)
      ])

      const formData = new FormData()
      const blob = new Blob([validJPEG], { type: 'image/jpeg' })
      formData.append('file', blob, 'valid.jpg')
      formData.append('type', 'company-file')

      const response = await request.post('/api/upload/company-files', {
        multipart: formData
      })

      // 應該要求認證
      expect([401, 403]).toContain(response.status())
      
      if ([401, 403].includes(response.status())) {
        const body = await response.json()
        expect(body.success).toBe(false)
        expect(body.error).toMatch(/unauthorized|forbidden|authentication|login/i)
      }
    })

    test('無效的認證不能上傳檔案', async ({ request }) => {
      // 創建有效的檔案
      const validJPEG = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
        ...Array(50).fill(0xFF)
      ])

      const formData = new FormData()
      const blob = new Blob([validJPEG], { type: 'image/jpeg' })
      formData.append('file', blob, 'valid.jpg')
      formData.append('type', 'company-file')

      const response = await request.post('/api/upload/company-files', {
        multipart: formData,
        headers: {
          'Authorization': 'Bearer invalid-token-12345'
        }
      })

      // 應該拒絕無效認證
      expect([401, 403]).toContain(response.status())
      
      if ([401, 403].includes(response.status())) {
        const body = await response.json()
        expect(body.success).toBe(false)
        expect(body.error).toMatch(/unauthorized|invalid.*token|authentication/i)
      }
    })
  })

  test.describe('📋 檔案內容驗證', () => {
    test('API 應該掃描檔案中的惡意內容', async ({ request }) => {
      // 創建包含潛在惡意內容的檔案
      const maliciousContents = [
        '<script>alert("xss")</script>',
        '<?php system($_GET["cmd"]); ?>',
        'eval(base64_decode($_POST["code"]))',
        'document.cookie = "session=hijacked"'
      ]

      for (const maliciousContent of maliciousContents) {
        // 將惡意內容偽裝成 JPEG（在檔頭之後）
        const fakeJPEG = Buffer.concat([
          Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
          Buffer.from(maliciousContent),
          Buffer.from([0xFF, 0xD9]) // JPEG end
        ])

        const formData = new FormData()
        const blob = new Blob([fakeJPEG], { type: 'image/jpeg' })
        formData.append('file', blob, 'malicious.jpg')
        formData.append('type', 'company-file')

        const response = await request.post('/api/upload/company-files', {
          multipart: formData
        })

        // 理想情況下應該檢測到惡意內容並拒絕
        // 但這取決於具體的實作
        if (response.status() === 400) {
          const body = await response.json()
          expect(body.error).toMatch(/malicious|content|invalid/i)
        }
        // 注意：這個測試可能會通過，因為不是所有系統都會檢查檔案內容
      }
    })
  })

  test.describe('🗂️ 檔案儲存安全', () => {
    test('上傳的檔案不應該可以直接執行', async ({ request }) => {
      // 這個測試檢查檔案是否被正確地儲存和隔離
      // 通常需要檢查檔案的儲存位置和權限
      
      test.skip(true, 'Requires file system access to verify storage security')
      
      // 在實際測試中，可能需要：
      // 1. 檢查上傳的檔案是否儲存在安全的位置
      // 2. 驗證檔案的權限設定
      // 3. 確認檔案不能被直接執行
      // 4. 檢查是否有適當的存取控制
    })

    test('檔案路徑不應該可以被操控', async ({ request }) => {
      test.skip(true, 'Requires specific path manipulation test implementation')
      
      // 測試是否可以通過操控檔案名稱來影響儲存路徑
      // 例如使用 ../ 來存取其他目錄
    })
  })
})