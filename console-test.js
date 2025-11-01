// 直接在控制台執行的測試代碼
// 測試刪除對話框
(function() {
  console.log('=== 測試刪除功能 ===');

  // 找到第一個刪除按鈕並點擊
  const deleteBtn = document.querySelector('button.text-red-600') ||
                    Array.from(document.querySelectorAll('button')).find(b =>
                      b.textContent.includes('刪除'));

  if (deleteBtn) {
    console.log('找到刪除按鈕，點擊中...');
    deleteBtn.click();

    // 等待對話框出現
    setTimeout(() => {
      // 檢查對話框
      const modal = document.querySelector('.fixed.inset-0.z-\\[9999\\]') ||
                   document.querySelector('[role="dialog"]');

      if (modal) {
        console.log('✅ 對話框已顯示');
        const title = modal.querySelector('h3');
        const confirmBtn = modal.querySelector('button.bg-red-600');
        const cancelBtn = modal.querySelector('button.bg-white');

        console.log('標題:', title ? title.textContent : '未找到');
        console.log('確認按鈕:', confirmBtn ? '存在' : '不存在');
        console.log('取消按鈕:', cancelBtn ? '存在' : '不存在');

        if (cancelBtn) {
          console.log('2秒後自動關閉對話框...');
          setTimeout(() => cancelBtn.click(), 2000);
        }
      } else {
        console.log('❌ 對話框未顯示');

        // 檢查是否有遮罩層
        const overlay = document.querySelector('.bg-black.bg-opacity-50');
        if (overlay) {
          console.log('找到遮罩層但沒有對話框內容');
        }
      }
    }, 500);
  } else {
    console.log('未找到刪除按鈕');
  }
})();