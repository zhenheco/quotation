-- ============================================================================
-- Migration 070: 升級振禾有限公司到 PROFESSIONAL 方案
-- ============================================================================

-- 升級公司訂閱到 PROFESSIONAL 方案
UPDATE company_subscriptions
SET
  plan_id = (SELECT id FROM subscription_plans WHERE tier = 'PROFESSIONAL' LIMIT 1),
  status = 'ACTIVE',
  current_period_end = NOW() + INTERVAL '100 years',
  updated_at = NOW()
WHERE company_id IN (
  SELECT id FROM companies WHERE tax_id = '83446730'
);

-- 如果公司沒有訂閱記錄，則建立一個
INSERT INTO company_subscriptions (company_id, plan_id, status, billing_cycle, current_period_end)
SELECT
  c.id,
  (SELECT id FROM subscription_plans WHERE tier = 'PROFESSIONAL' LIMIT 1),
  'ACTIVE',
  'YEARLY',
  NOW() + INTERVAL '100 years'
FROM companies c
WHERE c.tax_id = '83446730'
  AND NOT EXISTS (
    SELECT 1 FROM company_subscriptions cs WHERE cs.company_id = c.id
  );

-- 記錄 migration
INSERT INTO schema_migrations (filename)
VALUES ('070_upgrade_company_to_professional.sql')
ON CONFLICT (filename) DO NOTHING;

-- 確認結果
SELECT
  c.name as company_name,
  c.tax_id,
  sp.tier,
  sp.name as plan_name,
  cs.status,
  cs.current_period_end
FROM company_subscriptions cs
JOIN companies c ON c.id = cs.company_id
JOIN subscription_plans sp ON sp.id = cs.plan_id
WHERE c.tax_id = '83446730';
