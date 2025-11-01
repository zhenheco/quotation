// 測試滾動行為 - 檢查是否還有橡皮筋效果
(function testScrollBehavior() {
  console.log('=== 測試滾動行為 ===');

  // 1. 檢查 CSS 屬性
  const htmlStyles = window.getComputedStyle(document.documentElement);
  const bodyStyles = window.getComputedStyle(document.body);

  console.log('\nHTML 元素樣式:');
  console.log('overscroll-behavior:', htmlStyles.overscrollBehavior);
  console.log('overflow-x:', htmlStyles.overflowX);
  console.log('position:', htmlStyles.position);
  console.log('height:', htmlStyles.height);

  console.log('\nBODY 元素樣式:');
  console.log('overscroll-behavior:', bodyStyles.overscrollBehavior);
  console.log('overflow-x:', bodyStyles.overflowX);
  console.log('position:', bodyStyles.position);
  console.log('min-height:', bodyStyles.minHeight);

  // 2. 檢查 touch-action（iOS 相關）
  console.log('\nTouch Action:');
  console.log('html touch-action:', htmlStyles.touchAction);
  console.log('body touch-action:', bodyStyles.touchAction);

  // 3. 檢查滾動容器
  const mainContainer = document.querySelector('#__next') || document.querySelector('body > div:first-child');
  if (mainContainer) {
    const containerStyles = window.getComputedStyle(mainContainer);
    console.log('\n主容器樣式:');
    console.log('overflow-y:', containerStyles.overflowY);
    console.log('overflow-x:', containerStyles.overflowX);
    console.log('overscroll-behavior:', containerStyles.overscrollBehavior);
    console.log('-webkit-overflow-scrolling:', containerStyles.webkitOverflowScrolling);
  }

  // 4. 測試滾動位置
  console.log('\n當前滾動位置:');
  console.log('scrollY:', window.scrollY);
  console.log('scrollHeight:', document.body.scrollHeight);
  console.log('clientHeight:', document.documentElement.clientHeight);

  // 5. 滾動到頂部並檢查
  console.log('\n測試滾動到頂部...');
  window.scrollTo(0, 0);
  setTimeout(() => {
    console.log('滾動到頂部後的 scrollY:', window.scrollY);
    if (window.scrollY === 0) {
      console.log('✅ 成功滾動到頂部');
    }

    // 嘗試向上滾動（應該被阻止）
    console.log('\n嘗試向上滾動（應該被阻止）...');
    window.scrollBy(0, -100);
    setTimeout(() => {
      console.log('嘗試向上滾動後的 scrollY:', window.scrollY);
      if (window.scrollY === 0) {
        console.log('✅ 向上滾動被正確阻止');
      } else {
        console.log('❌ 仍然可以向上滾動超出邊界');
      }
    }, 100);
  }, 500);

  // 6. 滾動到底部並檢查
  setTimeout(() => {
    console.log('\n測試滾動到底部...');
    const maxScroll = document.body.scrollHeight - document.documentElement.clientHeight;
    window.scrollTo(0, maxScroll);

    setTimeout(() => {
      console.log('滾動到底部後的 scrollY:', window.scrollY);
      console.log('最大可滾動距離:', maxScroll);
      if (Math.abs(window.scrollY - maxScroll) < 10) {
        console.log('✅ 成功滾動到底部');
      }

      // 嘗試向下滾動（應該被阻止）
      console.log('\n嘗試向下滾動（應該被阻止）...');
      const beforeScroll = window.scrollY;
      window.scrollBy(0, 100);
      setTimeout(() => {
        console.log('嘗試向下滾動後的 scrollY:', window.scrollY);
        if (Math.abs(window.scrollY - beforeScroll) < 10) {
          console.log('✅ 向下滾動被正確阻止');
        } else {
          console.log('❌ 仍然可以向下滾動超出邊界');
        }
      }, 100);
    }, 500);
  }, 1500);

})();