/**
 * POS 系統 DAL 模組索引
 * Account-system → quotation-system 整合
 */

// 租戶與分店
export * from './tenants.dal'

// 會員管理
export {
  type Gender,
  type PaymentMethodType,
  type MemberLevel,
  type PosMember,
  type MemberDeposit,
  type CreateMemberInput,
  type UpdateMemberInput,
  type MemberQueryOptions,
  type MemberWithLevel,
  getMemberLevels,
  getMemberLevelBySpent,
  getMembers,
  getMemberById,
  getMemberByPhone,
  getMemberByNo,
  getMemberDeposits,
  createMember,
  updateMember,
  deleteMember,
  depositToMember,
  deductMemberBalance,
  updateMemberSpent,
  // RPC 版本
  depositToMemberRpc,
} from './members.dal'

// 服務項目
export * from './services.dal'

// 銷售交易（排除重複的 PaymentMethodType）
export {
  type SalesStatus,
  type DiscountType,
  type SalesTransaction,
  type TransactionItem,
  type TransactionPayment,
  type TransactionCommission,
  type SalesTransactionFull,
  type CreateSalesTransactionInput,
  type SalesQueryOptions,
  type SalesSummary,
  getSalesTransactions,
  getSalesTransactionById,
  getSalesTransactionByNo,
  getSalesSummary,
  createSalesTransaction,
  voidSalesTransaction,
  refundSalesTransaction,
  createTransactionCommission,
  // RPC 版本
  createSalesTransactionRpc,
  voidSalesTransactionRpc,
  calculateTransactionCommissionsRpc,
  getSalesSummaryRpc,
} from './sales.dal'

// 日結帳
export * from './settlements.dal'
