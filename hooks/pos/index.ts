/**
 * POS 模組 React Query Hooks
 * Account-system → quotation-system 整合
 */

// 銷售交易
export {
  salesKeys,
  useSales,
  useSale,
  useDailySummary,
  useDailySalesReport,
  useCreateSale,
  useVoidSale,
  useRefundSale,
} from './use-sales'

// 日結帳
export {
  settlementKeys,
  useSettlements,
  useSettlement,
  useSettlementForDate,
  useMonthlySettlementReport,
  useSettlementWorkflow,
  useStartSettlement,
  useCountSettlementCash,
  useApproveSettlement,
  useLockSettlement,
} from './use-settlements'

// 會員
export {
  memberKeys,
  useMembers,
  useMember,
  useMemberByPhone,
  useMemberBalance,
  useMemberDeposits,
  useMemberLevels,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useDepositToMember,
  useDeductMemberBalance,
} from './use-members'
