-- ============================================================================
-- Migration: 043_accounting_enums.sql
-- Created: 2025-12-15
-- Description: 建立會計系統與 POS 系統所需的所有 PostgreSQL Enums
-- Source: Account-system Prisma Schema
-- ============================================================================

-- ============================================================================
-- 1. 會計系統核心 Enums
-- ============================================================================

-- 營業稅計算方法
DO $$ BEGIN
  CREATE TYPE vat_method AS ENUM ('STANDARD', 'DIRECT', 'RATIO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE vat_method IS '營業稅計算方法：STANDARD=一般稅額計算, DIRECT=直接扣抵法(403), RATIO=比例扣抵法(403)';

-- 會計科目類別
DO $$ BEGIN
  CREATE TYPE account_category AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE account_category IS '會計科目類別：ASSET=資產, LIABILITY=負債, EQUITY=權益, REVENUE=收入, EXPENSE=費用, COST=成本';

-- 稅務類型
DO $$ BEGIN
  CREATE TYPE tax_type AS ENUM ('TAXABLE', 'ZERO_RATED', 'EXEMPT', 'NON_TAXABLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE tax_type IS '稅務類型：TAXABLE=應稅, ZERO_RATED=零稅率, EXEMPT=免稅, NON_TAXABLE=不課稅';

-- 往來對象類型
DO $$ BEGIN
  CREATE TYPE counterparty_type AS ENUM ('CUSTOMER', 'VENDOR', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE counterparty_type IS '往來對象類型：CUSTOMER=客戶, VENDOR=供應商, BOTH=兩者';

-- 發票類型
DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM ('OUTPUT', 'INPUT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE invoice_type IS '發票類型：OUTPUT=銷項(開立給客戶), INPUT=進項(收到供應商的)';

-- 發票狀態
DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('DRAFT', 'VERIFIED', 'POSTED', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE invoice_status IS '發票狀態：DRAFT=草稿, VERIFIED=已驗證, POSTED=已過帳, VOIDED=作廢';

-- 支付狀態（會計用）
DO $$ BEGIN
  CREATE TYPE acc_payment_status AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE acc_payment_status IS '支付狀態：UNPAID=未付款, PARTIAL=部分付款, PAID=已付款, OVERDUE=逾期';

-- 支付方式
DO $$ BEGIN
  CREATE TYPE payment_method_type AS ENUM ('CASH', 'CHECK', 'TRANSFER', 'CREDIT_CARD', 'UNCLASSIFIED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE payment_method_type IS '支付方式：CASH=現金, CHECK=支票, TRANSFER=轉帳, CREDIT_CARD=信用卡, UNCLASSIFIED=未分類';

-- 傳票狀態
DO $$ BEGIN
  CREATE TYPE journal_status AS ENUM ('DRAFT', 'POSTED', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE journal_status IS '傳票狀態：DRAFT=草稿, POSTED=已過帳, VOIDED=已作廢';

-- 交易來源類型
DO $$ BEGIN
  CREATE TYPE transaction_source AS ENUM ('INVOICE', 'MANUAL', 'IMPORT', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE transaction_source IS '交易來源類型：INVOICE=發票自動產生, MANUAL=手動輸入, IMPORT=匯入, ADJUSTMENT=調整分錄';

-- 交易狀態
DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('DRAFT', 'POSTED', 'LOCKED', 'VOIDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE transaction_status IS '交易狀態：DRAFT=草稿, POSTED=已過帳, LOCKED=已鎖定(已申報), VOIDED=作廢';

-- 匯入狀態
DO $$ BEGIN
  CREATE TYPE import_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE import_status IS '匯入狀態：PENDING=待處理, PROCESSING=處理中, COMPLETED=已完成, FAILED=失敗';

-- 對帳狀態
DO $$ BEGIN
  CREATE TYPE reconciliation_status AS ENUM ('UNRECONCILED', 'MATCHED', 'EXCEPTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE reconciliation_status IS '對帳狀態：UNRECONCILED=未對帳, MATCHED=已匹配, EXCEPTION=異常';

-- 會計期間類型
DO $$ BEGIN
  CREATE TYPE accounting_period_type AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE accounting_period_type IS '會計期間類型：MONTHLY=月度, YEARLY=年度';

-- 期間狀態
DO $$ BEGIN
  CREATE TYPE period_status AS ENUM ('OPEN', 'CLOSING', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE period_status IS '期間狀態：OPEN=開放, CLOSING=結帳中, CLOSED=已結帳';

-- 稅務申報類型
DO $$ BEGIN
  CREATE TYPE tax_return_type AS ENUM ('VAT_401', 'VAT_403', 'INCOME_TAX', 'WITHHOLDING', 'NHI_SUPPLEMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE tax_return_type IS '稅務申報類型：VAT_401=營業稅401, VAT_403=營業稅403(兼營), INCOME_TAX=營所稅, WITHHOLDING=扣繳申報, NHI_SUPPLEMENT=二代健保';

-- 稅務申報狀態
DO $$ BEGIN
  CREATE TYPE tax_return_status AS ENUM ('DRAFT', 'CALCULATED', 'SUBMITTED', 'PAID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE tax_return_status IS '稅務申報狀態：DRAFT=草稿, CALCULATED=已計算, SUBMITTED=已申報, PAID=已繳納';

-- 所得類別
DO $$ BEGIN
  CREATE TYPE income_type AS ENUM ('SALARY', 'PROFESSIONAL_FEE', 'RENT', 'INTEREST', 'DIVIDEND', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE income_type IS '所得類別：SALARY=薪資, PROFESSIONAL_FEE=執行業務, RENT=租賃, INTEREST=利息, DIVIDEND=股利, OTHER=其他';

-- 補充保費給付類別
DO $$ BEGIN
  CREATE TYPE nhi_payment_type AS ENUM ('DIVIDEND', 'RENT', 'INTEREST', 'BONUS', 'PROFESSIONAL_FEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE nhi_payment_type IS '補充保費給付類別：DIVIDEND=股利, RENT=租金, INTEREST=利息, BONUS=獎金, PROFESSIONAL_FEE=執行業務';

-- ============================================================================
-- 2. POS 系統 Enums
-- ============================================================================

-- 租戶訂閱方案
DO $$ BEGIN
  CREATE TYPE tenant_plan AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE tenant_plan IS '租戶訂閱方案：STARTER=入門版(1店/5人), PROFESSIONAL=專業版(3店/15人), ENTERPRISE=企業版(10店/50人)';

-- 員工角色
DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('OWNER', 'MANAGER', 'CASHIER', 'TECHNICIAN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE staff_role IS '員工角色：OWNER=負責人, MANAGER=店長, CASHIER=收銀員, TECHNICIAN=技師';

-- 排班狀態
DO $$ BEGIN
  CREATE TYPE schedule_status AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'ABSENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE schedule_status IS '排班狀態：SCHEDULED=已排班, CONFIRMED=已確認, CANCELLED=已取消, ABSENT=缺勤';

-- 抽成類型
DO $$ BEGIN
  CREATE TYPE commission_type AS ENUM ('FIXED', 'PERCENTAGE', 'TIERED', 'HYBRID');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE commission_type IS '抽成類型：FIXED=固定金額, PERCENTAGE=固定比例, TIERED=階梯式, HYBRID=混合制';

-- 性別
DO $$ BEGIN
  CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE gender IS '性別：MALE=男, FEMALE=女, OTHER=其他';

-- 儲值促銷類型
DO $$ BEGIN
  CREATE TYPE deposit_promotion_type AS ENUM ('FIXED', 'TIERED', 'FIRST_TIME');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE deposit_promotion_type IS '儲值促銷類型：FIXED=固定贈送, TIERED=階梯式, FIRST_TIME=首儲加碼';

-- 銷售狀態
DO $$ BEGIN
  CREATE TYPE sales_status AS ENUM ('PENDING', 'COMPLETED', 'VOIDED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE sales_status IS '銷售狀態：PENDING=待結帳, COMPLETED=已完成, VOIDED=已作廢, REFUNDED=已退款';

-- 折扣類型
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('MEMBER_LEVEL', 'PROMOTION', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE discount_type IS '折扣類型：MEMBER_LEVEL=會員等級折扣, PROMOTION=促銷活動, MANUAL=手動折扣';

-- 日結狀態
DO $$ BEGIN
  CREATE TYPE settlement_status AS ENUM ('PENDING', 'COUNTING', 'VARIANCE', 'APPROVED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE settlement_status IS '日結狀態：PENDING=待盤點, COUNTING=盤點中, VARIANCE=有差異待審, APPROVED=已核准, LOCKED=已鎖定';

-- ============================================================================
-- 3. 資安強化 Enums
-- ============================================================================

-- 審計操作類型
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
    'CREATE', 'READ', 'UPDATE', 'DELETE',
    'CHECKOUT', 'VOID_TRANSACTION', 'REFUND', 'DEPOSIT', 'SETTLEMENT',
    'PERMISSION_CHANGE', 'DEVICE_REGISTER', 'DEVICE_REVOKE', 'EXPORT_DATA', 'IMPORT_DATA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE audit_action IS '審計操作類型';

-- 審計狀態
DO $$ BEGIN
  CREATE TYPE audit_status AS ENUM ('SUCCESS', 'FAILED', 'BLOCKED', 'SUSPICIOUS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE audit_status IS '審計狀態：SUCCESS=成功, FAILED=失敗, BLOCKED=已封鎖, SUSPICIOUS=可疑';

-- 安全事件類型
DO $$ BEGIN
  CREATE TYPE security_event_type AS ENUM (
    'BRUTE_FORCE_ATTEMPT', 'SUSPICIOUS_LOGIN', 'UNUSUAL_LOCATION', 'UNUSUAL_TIME', 'MULTIPLE_FAILED_LOGINS',
    'FREQUENT_VOIDS', 'LARGE_TRANSACTION', 'UNUSUAL_DISCOUNT', 'SUSPICIOUS_REFUND',
    'UNAUTHORIZED_ACCESS', 'RATE_LIMIT_EXCEEDED', 'INVALID_TOKEN', 'SESSION_HIJACK_ATTEMPT',
    'SENSITIVE_DATA_ACCESS', 'BULK_DATA_EXPORT', 'DATA_TAMPERING_ATTEMPT',
    'UNREGISTERED_DEVICE', 'DEVICE_COMPROMISED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE security_event_type IS '安全事件類型';

-- 安全事件嚴重程度
DO $$ BEGIN
  CREATE TYPE security_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE security_severity IS '安全事件嚴重程度：LOW=低, MEDIUM=中, HIGH=高, CRITICAL=嚴重';

-- 安全事件處理狀態
DO $$ BEGIN
  CREATE TYPE security_event_status AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE', 'ESCALATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE security_event_status IS '安全事件處理狀態';

-- 裝置類型
DO $$ BEGIN
  CREATE TYPE device_type AS ENUM ('POS_TERMINAL', 'TABLET', 'MOBILE', 'DESKTOP', 'KIOSK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE device_type IS '裝置類型：POS_TERMINAL=收銀機, TABLET=平板, MOBILE=手機, DESKTOP=桌機, KIOSK=自助機';

-- 裝置狀態
DO $$ BEGIN
  CREATE TYPE device_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE device_status IS '裝置狀態：PENDING=待審核, ACTIVE=已啟用, SUSPENDED=已暫停, REVOKED=已撤銷';

-- 臨時權限狀態
DO $$ BEGIN
  CREATE TYPE temp_permission_status AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE temp_permission_status IS '臨時權限狀態：ACTIVE=生效中, USED=已使用, EXPIRED=已過期, REVOKED=已撤銷';

-- 金鑰類型
DO $$ BEGIN
  CREATE TYPE key_type AS ENUM ('AES_256_GCM', 'AES_256_CBC', 'RSA_2048', 'RSA_4096');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE key_type IS '加密金鑰類型';

-- 金鑰狀態
DO $$ BEGIN
  CREATE TYPE key_status AS ENUM ('ACTIVE', 'ROTATING', 'RETIRED', 'COMPROMISED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE key_status IS '金鑰狀態：ACTIVE=使用中, ROTATING=輪替中, RETIRED=已退役, COMPROMISED=已洩露';

-- 同意類型
DO $$ BEGIN
  CREATE TYPE consent_type AS ENUM ('PRIVACY_POLICY', 'TERMS_OF_SERVICE', 'MARKETING', 'DATA_COLLECTION', 'THIRD_PARTY_SHARE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
COMMENT ON TYPE consent_type IS '同意類型：PRIVACY_POLICY=隱私政策, TERMS_OF_SERVICE=服務條款, MARKETING=行銷, DATA_COLLECTION=資料蒐集, THIRD_PARTY_SHARE=第三方分享';

-- ============================================================================
-- 記錄遷移
-- ============================================================================

INSERT INTO schema_migrations (filename)
VALUES ('043_accounting_enums.sql')
ON CONFLICT (filename) DO NOTHING;

-- 刷新 Schema Cache
NOTIFY pgrst, 'reload schema';

SELECT 'Accounting & POS enums migration completed! 40 enums created.' as status;
