/**
 * 光貿 (Amego) API 型別定義
 */

export interface GuangmaoConfig {
  invoice: string; // 統一編號
  appKey: string;
  baseUrl?: string; // 預設 https://invoice-api.amego.tw/
}

export interface GuangmaoProductItem {
  Description: string;
  Quantity: number;
  UnitPrice: number;
  Amount: number;
  SequenceNumber?: number;
  Remark?: string;
  ItemTaxType?: string; // '1': 應稅, '2': 零稅率, '3': 免稅
}

/**
 * 開立發票請求資料 (f0401 / f0401_custom)
 */
export interface GuangmaoInvoiceIssueData {
  OrderId: string;
  BuyerIdentifier: string; // 買方統編 (B2B) 或 '0000000000' (B2C)
  BuyerName: string;
  SalesAmount: number; // 未稅金額
  FreeTaxSalesAmount?: number;
  ZeroTaxSalesAmount?: number;
  TaxType: '1' | '2' | '3'; // 1: 應稅, 2: 零稅率, 3: 免稅, 4: 應稅與免稅混合 (需注意計算)
  TaxRate: number; // 0.05
  TaxAmount: number;
  TotalAmount: number; // 含稅金額
  ProductItem: GuangmaoProductItem[];
  DonateMark?: '0' | '1';
  CarrierType?: string; // '1': 綠界 (?), '2': 自然人憑證, '3': 手機條碼
  CarrierId?: string;
  LoveCode?: string;
  PrintMark?: 'Y' | 'N';
  MainRemark?: string;
  CustomsClearanceMark?: '1' | '2'; // 零稅率適用
}

/**
 * API 基礎請求格式
 */
export interface GuangmaoRequest {
  invoice: string;
  data: string; // JSON string of GuangmaoInvoiceIssueData etc.
  time: number; // Unix timestamp
  sign: string; // MD5(JSON data + timestamp + APP_KEY)
}

/**
 * API 回應格式
 */
export interface GuangmaoResponse<T = unknown> {
  code: number; // 0 為成功
  msg: string;
  data?: T;
}

export interface GuangmaoInvoiceResult {
  InvoiceNumber: string;
  InvoiceDate: string;
  InvoiceTime: string;
  RandomNumber: string;
}

/**
 * 作廢發票請求資料 (f0501)
 */
export interface GuangmaoInvoiceVoidData {
  InvoiceNumber: string;
  InvoiceDate: string;
  BuyerIdentifier: string;
  SellerIdentifier: string;
  VoidReason: string;
}

/**
 * 折讓請求資料 (g0401)
 */
export interface GuangmaoAllowanceData {
  AllowanceDate: string;
  SellerIdentifier: string;
  BuyerIdentifier: string;
  BuyerName: string;
  AllowanceType: '1' | '2'; // 1: 買方, 2: 賣方
  TaxType: '1' | '2' | '3';
  TotalAmount: number;
  TaxAmount: number;
  ProductItem: {
    OriginalInvoiceDate: string;
    OriginalInvoiceNumber: string;
    OriginalSequenceNumber?: number;
    Description: string;
    Quantity: number;
    UnitPrice: number;
    Amount: number;
    Tax: number;
  }[];
}
