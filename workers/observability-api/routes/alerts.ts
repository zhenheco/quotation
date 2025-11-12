import { Hono } from 'hono';

export interface Env {
  DB: D1Database;
}

export interface AlertRule {
  id?: string;
  name: string;
  condition: string;
  threshold: number;
  cooldown_minutes: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AlertEvent {
  id?: string;
  rule_id: string;
  triggered_at: string;
  value: number;
  message: string;
  resolved_at?: string;
}

const alertsApp = new Hono<{ Bindings: Env }>();

alertsApp.get('/rules', async (c) => {
  const { enabled } = c.req.query() as Record<string, string>;

  let query = 'SELECT * FROM alert_rules';
  const params: unknown[] = [];

  if (enabled !== undefined) {
    query += ' WHERE enabled = ?';
    params.push(enabled === 'true' ? 1 : 0);
  }

  query += ' ORDER BY created_at DESC';

  const result = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    rules: result.results,
    total: result.results.length,
  });
});

alertsApp.get('/rules/:id', async (c) => {
  const id = c.req.param('id');

  const query = 'SELECT * FROM alert_rules WHERE id = ?';
  const result = await c.env.DB.prepare(query).bind(id).first();

  if (!result) {
    return c.json({ error: 'Alert rule not found' }, 404);
  }

  return c.json(result);
});

alertsApp.post('/rules', async (c) => {
  const body = (await c.req.json()) as AlertRule;

  const { name, condition, threshold, cooldown_minutes, severity, enabled = true } = body;

  if (!name || !condition || threshold === undefined || !cooldown_minutes || !severity) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const id = crypto.randomUUID();

  const query = `
    INSERT INTO alert_rules (id, name, condition, threshold, cooldown_minutes, severity, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  await c.env.DB.prepare(query)
    .bind(id, name, condition, threshold, cooldown_minutes, severity, enabled ? 1 : 0)
    .run();

  return c.json({ id, ...body }, 201);
});

alertsApp.put('/rules/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json()) as Partial<AlertRule>;

  const existingRule = await c.env.DB.prepare('SELECT * FROM alert_rules WHERE id = ?')
    .bind(id)
    .first();

  if (!existingRule) {
    return c.json({ error: 'Alert rule not found' }, 404);
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    params.push(body.name);
  }

  if (body.condition !== undefined) {
    updates.push('condition = ?');
    params.push(body.condition);
  }

  if (body.threshold !== undefined) {
    updates.push('threshold = ?');
    params.push(body.threshold);
  }

  if (body.cooldown_minutes !== undefined) {
    updates.push('cooldown_minutes = ?');
    params.push(body.cooldown_minutes);
  }

  if (body.severity !== undefined) {
    updates.push('severity = ?');
    params.push(body.severity);
  }

  if (body.enabled !== undefined) {
    updates.push('enabled = ?');
    params.push(body.enabled ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');

  const query = `
    UPDATE alert_rules
    SET ${updates.join(', ')}
    WHERE id = ?
  `;

  await c.env.DB.prepare(query).bind(...params, id).run();

  const updatedRule = await c.env.DB.prepare('SELECT * FROM alert_rules WHERE id = ?')
    .bind(id)
    .first();

  return c.json(updatedRule);
});

alertsApp.delete('/rules/:id', async (c) => {
  const id = c.req.param('id');

  const existingRule = await c.env.DB.prepare('SELECT * FROM alert_rules WHERE id = ?')
    .bind(id)
    .first();

  if (!existingRule) {
    return c.json({ error: 'Alert rule not found' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM alert_rules WHERE id = ?').bind(id).run();

  return c.json({ message: 'Alert rule deleted successfully' });
});

alertsApp.get('/events', async (c) => {
  const { ruleId, resolved, hours = '24', limit = '100', offset = '0' } = c.req.query() as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (ruleId) {
    conditions.push('rule_id = ?');
    params.push(ruleId);
  }

  if (resolved === 'true') {
    conditions.push('resolved_at IS NOT NULL');
  } else if (resolved === 'false') {
    conditions.push('resolved_at IS NULL');
  }

  if (hours) {
    conditions.push("triggered_at > datetime('now', '-' || ? || ' hours')");
    params.push(Number(hours));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM alert_events ${whereClause}`;
  const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
  const total = (countResult as { total: number } | null)?.total || 0;

  const query = `
    SELECT ae.*, ar.name as rule_name, ar.severity
    FROM alert_events ae
    LEFT JOIN alert_rules ar ON ae.rule_id = ar.id
    ${whereClause}
    ORDER BY triggered_at DESC
    LIMIT ? OFFSET ?
  `;

  const result = await c.env.DB.prepare(query)
    .bind(...params, Number(limit), Number(offset))
    .all();

  return c.json({
    events: result.results,
    total,
    limit: Number(limit),
    offset: Number(offset),
  });
});

alertsApp.post('/events/:id/resolve', async (c) => {
  const id = c.req.param('id');

  const existingEvent = await c.env.DB.prepare('SELECT * FROM alert_events WHERE id = ?')
    .bind(id)
    .first();

  if (!existingEvent) {
    return c.json({ error: 'Alert event not found' }, 404);
  }

  const query = `
    UPDATE alert_events
    SET resolved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  await c.env.DB.prepare(query).bind(id).run();

  const updatedEvent = await c.env.DB.prepare('SELECT * FROM alert_events WHERE id = ?')
    .bind(id)
    .first();

  return c.json(updatedEvent);
});

alertsApp.get('/stats', async (c) => {
  const { hours = '24' } = c.req.query() as Record<string, string>;

  const query = `
    SELECT
      COUNT(*) as total_alerts,
      COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as active_alerts,
      COUNT(CASE WHEN resolved_at IS NOT NULL THEN 1 END) as resolved_alerts,
      ar.severity,
      ar.name as rule_name
    FROM alert_events ae
    LEFT JOIN alert_rules ar ON ae.rule_id = ar.id
    WHERE ae.triggered_at > datetime('now', '-' || ? || ' hours')
    GROUP BY ar.severity, ar.name
    ORDER BY total_alerts DESC
  `;

  const result = await c.env.DB.prepare(query).bind(Number(hours)).all();

  return c.json({
    stats: result.results,
    hours: Number(hours),
  });
});

export default alertsApp;
