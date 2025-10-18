/**
 * API Usage Examples
 * 合約管理和收款管理 API 使用範例
 *
 * 這些範例展示如何在前端或其他服務中調用 API
 */

// ============================================================================
// 型別定義
// ============================================================================

interface QuotationToContractRequest {
  quotation_id: string;
  signed_date: string;
  expiry_date: string;
  payment_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  payment_day?: number;
}

interface RecordPaymentRequest {
  customer_id: string;
  contract_id?: string;
  quotation_id?: string;
  payment_type: 'deposit' | 'installment' | 'final' | 'full' | 'recurring';
  payment_date: string;
  amount: number;
  currency: string;
  payment_method?: 'bank_transfer' | 'credit_card' | 'check' | 'cash' | 'other';
  reference_number?: string;
  notes?: string;
  schedule_id?: string;
}

interface UpdateNextCollectionRequest {
  next_collection_date: string;
  next_collection_amount: number;
}

// ============================================================================
// 1. 合約管理 API 範例
// ============================================================================

/**
 * 範例 1: 將報價單轉換為合約
 */
async function convertQuotationToContract(data: QuotationToContractRequest) {
  try {
    const response = await fetch('/api/contracts/from-quotation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to convert quotation');
    }

    const result = await response.json();
    console.log('✅ 合約建立成功:', result.data);

    return result.data;
  } catch (error) {
    console.error('❌ 建立合約失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleConvertQuotation = async () => {
  const result = await convertQuotationToContract({
    quotation_id: 'quotation-uuid',
    signed_date: '2025-01-01',
    expiry_date: '2026-01-01',
    payment_frequency: 'quarterly',
    payment_day: 5,
  });

  console.log('合約編號:', result.contract.contract_number);
  console.log('下次應收日期:', result.contract.next_collection_date);
  console.log('下次應收金額:', result.contract.next_collection_amount);
};

/**
 * 範例 2: 更新合約的下次應收資訊
 */
async function updateContractNextCollection(
  contractId: string,
  data: UpdateNextCollectionRequest
) {
  try {
    const response = await fetch(`/api/contracts/${contractId}/next-collection`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update next collection');
    }

    const result = await response.json();
    console.log('✅ 下次應收資訊已更新:', result.data);

    return result.data;
  } catch (error) {
    console.error('❌ 更新失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleUpdateNextCollection = async () => {
  await updateContractNextCollection('contract-uuid', {
    next_collection_date: '2025-05-05',
    next_collection_amount: 13125,
  });
};

/**
 * 範例 3: 查詢合約收款進度
 */
async function getContractPaymentProgress(contractId: string) {
  try {
    const response = await fetch(`/api/contracts/${contractId}/payment-progress`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get payment progress');
    }

    const result = await response.json();
    console.log('📊 收款進度:', result.data);

    return result.data;
  } catch (error) {
    console.error('❌ 查詢失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleGetProgress = async () => {
  const progress = await getContractPaymentProgress('contract-uuid');

  console.log('合約總金額:', progress.total_amount);
  console.log('已收金額:', progress.total_paid);
  console.log('待收金額:', progress.total_pending);
  console.log('逾期金額:', progress.total_overdue);
  console.log('完成率:', progress.payment_completion_rate + '%');
};

/**
 * 範例 4: 查詢有逾期款項的合約
 */
async function getOverdueContracts() {
  try {
    const response = await fetch('/api/contracts/overdue');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get overdue contracts');
    }

    const result = await response.json();
    console.log(`⚠️  找到 ${result.count} 個逾期合約`);

    return result.data;
  } catch (error) {
    console.error('❌ 查詢失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleGetOverdueContracts = async () => {
  const overdueContracts = await getOverdueContracts();

  overdueContracts.forEach((contract: any) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('合約編號:', contract.contract_number);
    console.log('客戶:', contract.customer_name_zh);
    console.log('逾期筆數:', contract.overdue_count);
    console.log('逾期總額:', contract.total_overdue_amount);
    console.log('最大逾期天數:', contract.max_days_overdue);
  });
};

// ============================================================================
// 2. 收款管理 API 範例
// ============================================================================

/**
 * 範例 5: 記錄收款
 */
async function recordPayment(data: RecordPaymentRequest) {
  try {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to record payment');
    }

    const result = await response.json();
    console.log('✅ 收款記錄已建立:', result.message);

    return result.data;
  } catch (error) {
    console.error('❌ 記錄收款失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleRecordPayment = async () => {
  const payment = await recordPayment({
    customer_id: 'customer-uuid',
    contract_id: 'contract-uuid',
    payment_type: 'recurring',
    payment_date: '2025-02-05',
    amount: 13125,
    currency: 'TWD',
    payment_method: 'bank_transfer',
    reference_number: 'TXN-20250205-001',
    notes: '第一季收款',
  });

  console.log('收款 ID:', payment.id);
  console.log('收款金額:', payment.amount);
  console.log('收款日期:', payment.payment_date);
};

/**
 * 範例 6: 查詢已收款列表
 */
async function getCollectedPayments(filters?: {
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  payment_type?: string;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.payment_type) params.append('payment_type', filters.payment_type);

    const url = `/api/payments/collected${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get collected payments');
    }

    const result = await response.json();
    console.log(`💰 已收款記錄: ${result.count} 筆`);

    return result;
  } catch (error) {
    console.error('❌ 查詢失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleGetCollectedPayments = async () => {
  const result = await getCollectedPayments({
    start_date: '2025-01-01',
    end_date: '2025-03-31',
  });

  console.log('總筆數:', result.summary.total_records);
  console.log('總金額:', result.summary.total_amount);
  console.log('按幣別統計:', result.summary.by_currency);

  result.data.forEach((payment: any) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('收款日期:', payment.payment_date);
    console.log('客戶:', payment.customer_name_zh);
    console.log('類型:', payment.payment_type_display);
    console.log('金額:', payment.amount, payment.currency);
    console.log('相關單號:', payment.related_number);
  });
};

/**
 * 範例 7: 查詢未收款列表（超過30天）
 */
async function getUnpaidPayments(filters?: {
  customer_id?: string;
  min_days_overdue?: number;
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);
    if (filters?.min_days_overdue) {
      params.append('min_days_overdue', filters.min_days_overdue.toString());
    }

    const url = `/api/payments/unpaid${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get unpaid payments');
    }

    const result = await response.json();
    console.log(`⚠️  未收款項目: ${result.count} 筆`);

    return result;
  } catch (error) {
    console.error('❌ 查詢失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleGetUnpaidPayments = async () => {
  const result = await getUnpaidPayments({
    min_days_overdue: 30,
  });

  console.log('總筆數:', result.summary.total_records);
  console.log('總金額:', result.summary.total_amount);
  console.log('最大逾期天數:', result.summary.max_days_overdue);

  result.data.forEach((item: any) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('合約:', item.contract_number);
    console.log('客戶:', item.customer_name_zh);
    console.log('到期日:', item.due_date);
    console.log('逾期天數:', item.days_overdue);
    console.log('金額:', item.amount, item.currency);
    console.log('提醒次數:', item.reminder_count);
  });
};

/**
 * 範例 8: 查詢收款提醒列表
 */
async function getPaymentReminders(filters?: {
  days_ahead?: number;
  status?: 'overdue' | 'due_today' | 'due_soon' | 'upcoming';
}) {
  try {
    const params = new URLSearchParams();
    if (filters?.days_ahead) params.append('days_ahead', filters.days_ahead.toString());
    if (filters?.status) params.append('status', filters.status);

    const url = `/api/payments/reminders${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get payment reminders');
    }

    const result = await response.json();
    console.log(`🔔 收款提醒: ${result.count} 筆`);

    return result;
  } catch (error) {
    console.error('❌ 查詢失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleGetPaymentReminders = async () => {
  const result = await getPaymentReminders({
    days_ahead: 30,
  });

  console.log('總筆數:', result.summary.total_records);
  console.log('狀態分布:', result.summary.by_status);

  // 按狀態顯示
  const statusLabels = {
    overdue: '已逾期',
    due_today: '今日到期',
    due_soon: '即將到期',
    upcoming: '未來到期',
  };

  Object.entries(result.grouped).forEach(([status, items]: [string, any]) => {
    if (items && items.length > 0) {
      console.log(`\n📋 ${statusLabels[status as keyof typeof statusLabels]} (${items.length} 筆)`);
      items.forEach((item: any) => {
        console.log('  -', item.customer_name_zh);
        console.log('    合約:', item.contract_number);
        console.log('    應收日:', item.next_collection_date);
        console.log('    金額:', item.next_collection_amount, item.currency);
      });
    }
  });
};

/**
 * 範例 9: 標記付款排程為逾期
 */
async function markPaymentAsOverdue(scheduleId: string) {
  try {
    const response = await fetch(`/api/payments/${scheduleId}/mark-overdue`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark as overdue');
    }

    const result = await response.json();
    console.log('✅ 已標記為逾期:', result.message);

    return result.data;
  } catch (error) {
    console.error('❌ 標記失敗:', error);
    throw error;
  }
}

// 使用範例：
const exampleMarkOverdue = async () => {
  const schedule = await markPaymentAsOverdue('schedule-uuid');

  console.log('排程 ID:', schedule.id);
  console.log('狀態:', schedule.status);
  console.log('逾期天數:', schedule.days_overdue);
};

// ============================================================================
// 3. 完整工作流程範例
// ============================================================================

/**
 * 完整範例: 從報價單到收款的完整流程
 */
async function completePaymentWorkflow() {
  console.log('🚀 開始完整收款流程...\n');

  try {
    // Step 1: 將報價單轉為合約
    console.log('Step 1: 將報價單轉為合約');
    const contractResult = await convertQuotationToContract({
      quotation_id: 'quotation-uuid',
      signed_date: '2025-01-01',
      expiry_date: '2026-01-01',
      payment_frequency: 'quarterly',
      payment_day: 5,
    });
    console.log('✅ 合約已建立:', contractResult.contract.contract_number);
    console.log('');

    // Step 2: 查看合約收款進度
    console.log('Step 2: 查看合約收款進度');
    const progress = await getContractPaymentProgress(contractResult.contract.id);
    console.log('✅ 收款進度:', progress.payment_completion_rate + '%');
    console.log('');

    // Step 3: 記錄第一筆收款
    console.log('Step 3: 記錄第一筆收款');
    const payment = await recordPayment({
      customer_id: contractResult.contract.customer_id,
      contract_id: contractResult.contract.id,
      payment_type: 'recurring',
      payment_date: '2025-02-05',
      amount: 13125,
      currency: 'TWD',
      payment_method: 'bank_transfer',
      notes: '第一季收款',
    });
    console.log('✅ 收款已記錄:', payment.id);
    console.log('');

    // Step 4: 查看更新後的收款進度
    console.log('Step 4: 查看更新後的收款進度');
    const updatedProgress = await getContractPaymentProgress(contractResult.contract.id);
    console.log('✅ 新的收款進度:', updatedProgress.payment_completion_rate + '%');
    console.log('');

    // Step 5: 查看下次收款提醒
    console.log('Step 5: 查看下次收款提醒');
    const reminders = await getPaymentReminders({ days_ahead: 30 });
    console.log('✅ 收款提醒數量:', reminders.count);
    console.log('');

    console.log('🎉 完整流程執行成功！');
  } catch (error) {
    console.error('❌ 流程執行失敗:', error);
  }
}

// ============================================================================
// 導出所有範例函式
// ============================================================================

export {
  // 合約管理
  convertQuotationToContract,
  updateContractNextCollection,
  getContractPaymentProgress,
  getOverdueContracts,

  // 收款管理
  recordPayment,
  getCollectedPayments,
  getUnpaidPayments,
  getPaymentReminders,
  markPaymentAsOverdue,

  // 完整流程
  completePaymentWorkflow,
};

// ============================================================================
// 使用說明
// ============================================================================

/*
  在前端專案中使用這些範例：

  1. React/Next.js 使用範例：

     import { recordPayment, getCollectedPayments } from '@/examples/api-usage-examples';

     const handleRecordPayment = async () => {
       const payment = await recordPayment({
         customer_id: customerId,
         contract_id: contractId,
         payment_type: 'recurring',
         payment_date: '2025-02-05',
         amount: 13125,
         currency: 'TWD',
       });

       // 更新 UI
       setPayments(prev => [...prev, payment]);
     };

  2. 錯誤處理：

     try {
       await recordPayment(paymentData);
       toast.success('收款記錄建立成功');
     } catch (error) {
       toast.error(error.message);
     }

  3. 與 React Query 整合：

     const { data, isLoading } = useQuery({
       queryKey: ['collected-payments'],
       queryFn: () => getCollectedPayments(),
     });
*/
