// 改進的測試腳本 - 直接測試刪除對話框
(function testDeleteModal() {
  console.log('=== 測試刪除功能 ===');

  // 1. 檢查是否有刪除按鈕
  const deleteButtons = Array.from(document.querySelectorAll('button')).filter(btn =>
    btn.textContent.includes('刪除') || btn.textContent.includes('Delete')
  );

  console.log('找到刪除按鈕數量:', deleteButtons.length);

  if (deleteButtons.length === 0) {
    console.error('❌ 沒有找到刪除按鈕');
    return;
  }

  // 2. 點擊第一個刪除按鈕
  console.log('點擊第一個刪除按鈕...');
  deleteButtons[0].click();

  // 3. 等待並檢查對話框
  setTimeout(() => {
    console.log('\n=== 檢查對話框狀態 ===');

    // 檢查所有可能的對話框元素
    const allFixedElements = document.querySelectorAll('[style*="fixed"], .fixed');
    console.log('所有 fixed 定位元素數量:', allFixedElements.length);

    allFixedElements.forEach((el, idx) => {
      const styles = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      console.log('\n元素 ' + (idx + 1) + ':', {
        className: el.className,
        zIndex: styles.zIndex,
        display: styles.display,
        visibility: styles.visibility,
        position: styles.position,
        bounds: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        },
        hasContent: el.textContent.length > 0
      });
    });

    // 特別檢查 body 直接子元素
    const bodyChildren = Array.from(document.body.children);
    const modalInBody = bodyChildren.find(el =>
      el.className && el.className.includes('fixed') &&
      el.className.includes('z-[9999]')
    );

    if (modalInBody) {
      console.log('\n✅ 找到通過 Portal 渲染的對話框！');
      console.log('對話框內容:', modalInBody.textContent.substring(0, 100) + '...');
    } else {
      console.log('\n❌ 沒有找到通過 Portal 渲染的對話框');
    }

    // 檢查是否有確認和取消按鈕
    const confirmBtn = document.querySelector('button.bg-red-600');
    const cancelBtn = document.querySelector('button.bg-white');

    console.log('\n按鈕狀態:');
    console.log('確認按鈕:', confirmBtn ? '✅ 存在' : '❌ 不存在');
    console.log('取消按鈕:', cancelBtn ? '✅ 存在' : '❌ 不存在');

    // 如果找到取消按鈕，點擊它來關閉對話框
    if (cancelBtn) {
      console.log('\n點擊取消按鈕關閉對話框...');
      setTimeout(() => {
        cancelBtn.click();
        console.log('對話框應該已關閉');
      }, 2000);
    }

  }, 1000);
})();