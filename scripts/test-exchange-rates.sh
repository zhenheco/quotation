#!/bin/bash

# 測試匯率 API 和換算邏輯

echo "========================================="
echo "測試匯率 API 端點"
echo "========================================="

# 啟動開發伺服器
echo "1. 啟動開發伺服器..."
npm run dev &
DEV_PID=$!
sleep 10

# 測試不同基準幣別的匯率 API
echo ""
echo "2. 測試 TWD 為基準的匯率 API:"
curl -s 'http://localhost:3000/api/exchange-rates?base=TWD' | jq .

echo ""
echo "3. 測試 USD 為基準的匯率 API:"
curl -s 'http://localhost:3000/api/exchange-rates?base=USD' | jq .

echo ""
echo "4. 測試 EUR 為基準的匯率 API:"
curl -s 'http://localhost:3000/api/exchange-rates?base=EUR' | jq .

echo ""
echo "========================================="
echo "驗證匯率換算邏輯"
echo "========================================="

node <<'NODEJS'
// 模擬前端的匯率換算邏輯
console.log('\n測試場景：報價單是 TWD，產品是 USD 100');
console.log('------------------------------------------');

const rates_TWD = {
  TWD: 1,
  CNY: 0.2325,
  EUR: 0.02794,
  JPY: 4.9258,
  USD: 0.03265
};

const productPrice_USD = 100;
const productCurrency = 'USD';
const quotationCurrency = 'TWD';

let convertedPrice = productPrice_USD;
if (productCurrency !== quotationCurrency) {
  const rate = rates_TWD[productCurrency];
  if (rate && rate !== 0) {
    convertedPrice = productPrice_USD / rate;
  }
}

console.log(`產品價格: ${productPrice_USD} ${productCurrency}`);
console.log(`匯率 (rates['${productCurrency}']): ${rates_TWD[productCurrency]}`);
console.log(`換算後價格: ${convertedPrice.toFixed(2)} ${quotationCurrency}`);
console.log(`驗證: 100 USD × 30.63 = ${(100 / 0.03265).toFixed(2)} TWD ✓`);

console.log('\n\n測試場景：報價單是 USD，產品是 TWD 3000');
console.log('------------------------------------------');

const rates_USD = {
  USD: 1,
  TWD: 30.6247,
  EUR: 0.8563,
  JPY: 150.4604,
  CNY: 7.1248
};

const productPrice_TWD = 3000;
const productCurrency2 = 'TWD';
const quotationCurrency2 = 'USD';

let convertedPrice2 = productPrice_TWD;
if (productCurrency2 !== quotationCurrency2) {
  const rate = rates_USD[productCurrency2];
  if (rate && rate !== 0) {
    convertedPrice2 = productPrice_TWD / rate;
  }
}

console.log(`產品價格: ${productPrice_TWD} ${productCurrency2}`);
console.log(`匯率 (rates['${productCurrency2}']): ${rates_USD[productCurrency2]}`);
console.log(`換算後價格: ${convertedPrice2.toFixed(2)} ${quotationCurrency2}`);
console.log(`驗證: 3000 TWD ÷ 30.6247 = ${(3000 / 30.6247).toFixed(2)} USD ✓`);
NODEJS

echo ""
echo "========================================="
echo "測試完成"
echo "========================================="

# 停止開發伺服器
kill $DEV_PID
echo "開發伺服器已停止"
