// 測試腳本：檢查刪除按鈕和對話框
console.log('開始測試刪除功能...');

// 檢查頁面是否有刪除按鈕
const deleteButtons = document.querySelectorAll('button[title*="刪除"], button[title*="Delete"]');
console.log('找到刪除按鈕數量:', deleteButtons.length);

if (deleteButtons.length > 0) {
  // 檢查第一個刪除按鈕
  const firstButton = deleteButtons[0];
  console.log('第一個刪除按鈕:', {
    text: firstButton.textContent,
    title: firstButton.title,
    disabled: firstButton.disabled,
    onclick: firstButton.onclick ? 'has onclick' : 'no onclick'
  });

  // 模擬點擊
  console.log('模擬點擊刪除按鈕...');
  firstButton.click();

  // 等待一下然後檢查對話框
  setTimeout(() => {
    // 檢查是否有對話框出現
    const modals = document.querySelectorAll('[role="dialog"], .fixed.z-\\[9999\\], .z-50');
    console.log('找到可能的對話框數量:', modals.length);

    modals.forEach((modal, idx) => {
      const computedStyle = window.getComputedStyle(modal);
      console.log('對話框 ' + (idx + 1) + ':', {
        className: modal.className,
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        zIndex: computedStyle.zIndex,
        position: computedStyle.position,
        opacity: computedStyle.opacity
      });
    });

    // 檢查是否有遮罩層
    const overlays = document.querySelectorAll('.bg-black.bg-opacity-50, .bg-gray-900.bg-opacity-50');
    console.log('找到遮罩層數量:', overlays.length);
  }, 500);
} else {
  console.log('未找到刪除按鈕');
}