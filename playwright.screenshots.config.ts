/**
 * Playwright 設定 - 截圖採集專用
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 測試目錄
  testDir: './tests/screenshots',

  // 截圖專用設定
  fullyParallel: false, // 截圖依序執行，避免干擾
  forbidOnly: !!process.env.CI,
  retries: 0, // 截圖不重試
  workers: 1, // 單一 worker 確保登入狀態一致

  reporter: 'list',

  use: {
    // 從環境變數讀取目標網站
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // 視窗大小
    viewport: { width: 1920, height: 1080 },

    // 不自動截圖（由手動控制）
    screenshot: 'off',

    // 不錄製影片
    video: 'off',

    // 不記錄 trace
    trace: 'off',
  },

  projects: [
    {
      name: 'screenshots',
      use: {
        ...devices['Desktop Chrome'],
        // 設定語言為繁體中文
        locale: 'zh-TW',
        // 設定時區
        timezoneId: 'Asia/Taipei',
      },
    },
  ],

  // 如果是本地開發，啟動 dev server
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000,
      },
});
