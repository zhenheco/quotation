/**
 * 瀏覽器 Console 測試資料建立腳本
 *
 * 使用方法：
 * 1. 在瀏覽器中登入系統
 * 2. 開啟 DevTools Console (F12)
 * 3. 複製整個腳本並貼上執行
 */

(async function seedPaymentTestData() {
  console.log('🌱 開始建立收款管理測試資料...\n');

  try {
    // 步驟 1: 建立測試客戶
    console.log('👥 建立測試客戶...');
    const customers = [
      {
        name: '台灣科技股份有限公司',
        email: 'contact@twtech.com.tw',
        phone: '+886-2-2345-6789',
        address: '台北市信義區信義路五段7號',
        tax_id: '12345678',
        contact_person: '王大明'
      },
      {
        name: '環球貿易有限公司',
        email: 'info@globaltrading.com',
        phone: '+886-4-2234-5678',
        address: '台中市西區公益路123號',
        tax_id: '23456789',
        contact_person: '李小華'
      },
      {
        name: '創新軟體開發公司',
        email: 'hello@innovsoft.com',
        phone: '+886-7-123-4567',
        address: '高雄市前金區中正四路56號',
        tax_id: '34567890',
        contact_person: '陳志明'
      }
    ];

    const createdCustomers = [];
    for (const customerData of customers) {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });

      if (!response.ok) {
        throw new Error(`建立客戶失敗: ${response.statusText}`);
      }

      const customer = await response.json();
      createdCustomers.push(customer);
      console.log(`  ✓ 已建立客戶: ${customer.name.zh}`);
    }
    console.log(`✅ 成功建立 ${createdCustomers.length} 個客戶\n`);

    // 步驟 2: 建立測試產品
    console.log('📦 建立測試產品...');
    const products = [
      {
        name: '企業網站設計',
        description: '專業響應式網站設計與開發',
        unit_price: 150000,
        currency: 'TWD',
        category: 'web_design',
        base_price: 150000
      },
      {
        name: '手機應用程式開發',
        description: 'iOS/Android 原生應用開發',
        unit_price: 300000,
        currency: 'TWD',
        category: 'mobile_dev',
        base_price: 300000
      }
    ];

    const createdProducts = [];
    for (const productData of products) {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });

      if (!response.ok) {
        throw new Error(`建立產品失敗: ${response.statusText}`);
      }

      const product = await response.json();
      createdProducts.push(product);
      console.log(`  ✓ 已建立產品: ${product.name.zh} (${product.currency} ${product.unit_price.toLocaleString()})`);
    }
    console.log(`✅ 成功建立 ${createdProducts.length} 個產品\n`);

    // 步驟 3: 建立測試報價單
    console.log('📝 建立測試報價單...');
    const today = new Date();
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const quotations = [
      {
        customer_id: createdCustomers[0].id,
        status: 'draft',
        issue_date: today.toISOString().split('T')[0],
        valid_until: thirtyDaysLater.toISOString().split('T')[0],
        currency: 'TWD',
        tax_rate: 0.05,
        items: [
          {
            product_id: createdProducts[0].id,
            description: '企業網站設計',
            quantity: 1,
            unit_price: createdProducts[0].unit_price,
            discount: 0
          }
        ]
      },
      {
        customer_id: createdCustomers[1].id,
        status: 'draft',
        issue_date: today.toISOString().split('T')[0],
        valid_until: thirtyDaysLater.toISOString().split('T')[0],
        currency: 'TWD',
        tax_rate: 0.05,
        items: [
          {
            product_id: createdProducts[1].id,
            description: '手機應用程式開發',
            quantity: 1,
            unit_price: createdProducts[1].unit_price,
            discount: 0
          }
        ]
      },
      {
        customer_id: createdCustomers[2].id,
        status: 'draft',
        issue_date: today.toISOString().split('T')[0],
        valid_until: thirtyDaysLater.toISOString().split('T')[0],
        currency: 'TWD',
        tax_rate: 0.05,
        items: [
          {
            product_id: createdProducts[0].id,
            description: '企業網站設計',
            quantity: 2,
            unit_price: createdProducts[0].unit_price,
            discount: 0.1
          },
          {
            product_id: createdProducts[1].id,
            description: '手機應用程式開發',
            quantity: 1,
            unit_price: createdProducts[1].unit_price,
            discount: 0
          }
        ]
      }
    ];

    const createdQuotations = [];
    for (const quotationData of quotations) {
      const response = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotationData)
      });

      if (!response.ok) {
        throw new Error(`建立報價單失敗: ${response.statusText}`);
      }

      const quotation = await response.json();
      createdQuotations.push(quotation);
      console.log(`  ✓ 已建立報價單: ${quotation.quotation_number} (${quotation.currency} ${quotation.total_amount.toLocaleString()})`);
    }
    console.log(`✅ 成功建立 ${createdQuotations.length} 個報價單\n`);

    // 步驟 4: 將報價單轉換為合約
    console.log('📋 將報價單轉換為合約...');
    const contracts = [];
    const paymentFrequencies = ['monthly', 'quarterly', 'semi_annual'];

    for (let i = 0; i < createdQuotations.length; i++) {
      const quotation = createdQuotations[i];
      const signedDate = new Date(today);
      signedDate.setDate(signedDate.getDate() - 30); // 30 天前簽約
      const expiryDate = new Date(signedDate);
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 一年期合約

      const contractData = {
        quotation_id: quotation.id,
        signed_date: signedDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        payment_frequency: paymentFrequencies[i % paymentFrequencies.length],
        payment_day: 5
      };

      const response = await fetch('/api/contracts/from-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractData)
      });

      if (!response.ok) {
        throw new Error(`建立合約失敗: ${response.statusText}`);
      }

      const result = await response.json();
      contracts.push(result.data.contract);
      console.log(`  ✓ 已建立合約: ${result.data.contract.contract_number} (付款頻率: ${contractData.payment_frequency})`);
    }
    console.log(`✅ 成功建立 ${contracts.length} 個合約\n`);

    console.log('✅ 收款管理測試資料建立完成！');
    console.log('\n📝 測試資料摘要：');
    console.log(`   • 客戶數: ${createdCustomers.length}`);
    console.log(`   • 產品數: ${createdProducts.length}`);
    console.log(`   • 報價單數: ${createdQuotations.length}`);
    console.log(`   • 合約數: ${contracts.length}`);
    console.log('\n💡 請重新整理頁面查看更新後的統計數據');

  } catch (error) {
    console.error('\n❌ 發生錯誤:', error);
    console.error('錯誤訊息:', error.message);
  }
})();
