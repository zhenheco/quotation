/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/analytics.d.ts" />
/* eslint-enable @typescript-eslint/triple-slash-reference */

export interface Env {
  DB: D1Database;
  ANALYTICS?: AnalyticsEngineDataset;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  cooldown_minutes: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

interface AlertEvaluationResult {
  ruleId: string;
  ruleName: string;
  shouldTrigger: boolean;
  currentValue: number;
  threshold: number;
  message: string;
}

async function evaluateErrorRate(
  analytics: AnalyticsEngineDataset,
  threshold: number
): Promise<{ value: number; shouldTrigger: boolean }> {
  const query = `
    SELECT
      SUM(CASE WHEN index3 = '5xx' THEN _sample_interval ELSE 0 END) as error_count,
      SUM(_sample_interval) as total_requests
    FROM analytics
    WHERE timestamp > NOW() - INTERVAL '5' MINUTE
  `;

  const result = await analytics.sql({ query });
  const data = result.data[0] as { error_count: number; total_requests: number };

  const errorRate = data.total_requests > 0 ? (data.error_count / data.total_requests) * 100 : 0;

  return {
    value: errorRate,
    shouldTrigger: errorRate > threshold,
  };
}

async function evaluateP95Latency(
  analytics: AnalyticsEngineDataset,
  threshold: number
): Promise<{ value: number; shouldTrigger: boolean }> {
  const query = `
    SELECT quantile(0.95)(double1) as p95_latency
    FROM analytics
    WHERE timestamp > NOW() - INTERVAL '5' MINUTE
  `;

  const result = await analytics.sql({ query });
  const data = result.data[0] as { p95_latency: number };

  return {
    value: data.p95_latency || 0,
    shouldTrigger: (data.p95_latency || 0) > threshold,
  };
}

async function evaluateRequestVolume(
  analytics: AnalyticsEngineDataset,
  threshold: number
): Promise<{ value: number; shouldTrigger: boolean }> {
  const query = `
    SELECT SUM(_sample_interval) as request_count
    FROM analytics
    WHERE timestamp > NOW() - INTERVAL '1' MINUTE
  `;

  const result = await analytics.sql({ query });
  const data = result.data[0] as { request_count: number };

  return {
    value: data.request_count || 0,
    shouldTrigger: (data.request_count || 0) < threshold,
  };
}

async function evaluateCondition(
  condition: string,
  threshold: number,
  analytics?: AnalyticsEngineDataset
): Promise<{ value: number; shouldTrigger: boolean }> {
  if (!analytics) {
    return { value: 0, shouldTrigger: false };
  }

  switch (condition) {
    case 'error_rate_percent':
      return evaluateErrorRate(analytics, threshold);
    case 'p95_latency_ms':
      return evaluateP95Latency(analytics, threshold);
    case 'request_volume_per_minute':
      return evaluateRequestVolume(analytics, threshold);
    default:
      return { value: 0, shouldTrigger: false };
  }
}

async function isInCooldown(db: D1Database, ruleId: string, cooldownMinutes: number): Promise<boolean> {
  const query = `
    SELECT triggered_at
    FROM alert_events
    WHERE
      rule_id = ?
      AND resolved_at IS NULL
      AND triggered_at > datetime('now', '-' || ? || ' minutes')
    ORDER BY triggered_at DESC
    LIMIT 1
  `;

  const result = await db.prepare(query).bind(ruleId, cooldownMinutes).first();

  return result !== null;
}

async function triggerAlert(
  db: D1Database,
  ruleId: string,
  value: number,
  message: string
): Promise<void> {
  const id = crypto.randomUUID();

  const query = `
    INSERT INTO alert_events (id, rule_id, triggered_at, value, message)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
  `;

  await db.prepare(query).bind(id, ruleId, value, message).run();
}

async function evaluateAlerts(env: Env): Promise<AlertEvaluationResult[]> {
  const rulesQuery = 'SELECT * FROM alert_rules WHERE enabled = 1';
  const rulesResult = await env.DB.prepare(rulesQuery).all();
  const rules = rulesResult.results as unknown as AlertRule[];

  const results: AlertEvaluationResult[] = [];

  for (const rule of rules) {
    const inCooldown = await isInCooldown(env.DB, rule.id, rule.cooldown_minutes);

    if (inCooldown) {
      continue;
    }

    const evaluation = await evaluateCondition(rule.condition, rule.threshold, env.ANALYTICS);

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      shouldTrigger: evaluation.shouldTrigger,
      currentValue: evaluation.value,
      threshold: rule.threshold,
      message: `${rule.name}: ${rule.condition} = ${evaluation.value.toFixed(2)} (threshold: ${rule.threshold})`,
    });

    if (evaluation.shouldTrigger) {
      await triggerAlert(
        env.DB,
        rule.id,
        evaluation.value,
        `Alert triggered: ${rule.name} - ${rule.condition} = ${evaluation.value.toFixed(2)} exceeds threshold ${rule.threshold}`
      );
    }
  }

  return results;
}

const alertEvaluatorWorker = {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil((async () => {
      const startTime = Date.now();

      const results = await evaluateAlerts(env);

      const triggeredAlerts = results.filter((r) => r.shouldTrigger);

      if (triggeredAlerts.length > 0) {
        console.log(
          `Alert Evaluator: ${triggeredAlerts.length} alerts triggered`,
          JSON.stringify(triggeredAlerts, null, 2)
        );
      }

      const duration = Date.now() - startTime;
      console.log(`Alert Evaluator completed in ${duration}ms`);
    })());
  },
};

export default alertEvaluatorWorker;
