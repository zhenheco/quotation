import { Hono } from 'hono';

export interface Env {
  DB: D1Database;
}

export interface Trace {
  id: string;
  request_id: string;
  trace_id: string;
  parent_span_id?: string;
  start_time: string;
  end_time: string;
  duration_ms: number;
  steps?: Record<string, unknown>;
  env?: string;
}

const tracesApp = new Hono<{ Bindings: Env }>();

tracesApp.get('/', async (c) => {
  const {
    startTime,
    endTime,
    minDuration,
    maxDuration,
    limit = '100',
    offset = '0',
  } = c.req.query() as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (startTime) {
    conditions.push('start_time >= ?');
    params.push(startTime);
  }

  if (endTime) {
    conditions.push('end_time <= ?');
    params.push(endTime);
  }

  if (minDuration) {
    conditions.push('duration_ms >= ?');
    params.push(Number(minDuration));
  }

  if (maxDuration) {
    conditions.push('duration_ms <= ?');
    params.push(Number(maxDuration));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM traces ${whereClause}`;
  const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
  const total = (countResult as { total: number } | null)?.total || 0;

  const query = `
    SELECT * FROM traces
    ${whereClause}
    ORDER BY start_time DESC
    LIMIT ? OFFSET ?
  `;

  const result = await c.env.DB.prepare(query)
    .bind(...params, Number(limit), Number(offset))
    .all();

  return c.json({
    traces: result.results,
    total,
    limit: Number(limit),
    offset: Number(offset),
  });
});

tracesApp.get('/:traceId', async (c) => {
  const traceId = c.req.param('traceId');

  const traceQuery = 'SELECT * FROM traces WHERE trace_id = ? ORDER BY start_time ASC';
  const traceResult = await c.env.DB.prepare(traceQuery).bind(traceId).all();

  if (traceResult.results.length === 0) {
    return c.json({ error: 'Trace not found' }, 404);
  }

  const logsQuery = `
    SELECT * FROM logs
    WHERE trace_id = ?
    ORDER BY timestamp ASC
  `;
  const logsResult = await c.env.DB.prepare(logsQuery).bind(traceId).all();

  return c.json({
    traceId,
    traces: traceResult.results,
    logs: logsResult.results,
    totalSpans: traceResult.results.length,
    totalLogs: logsResult.results.length,
  });
});

tracesApp.get('/request/:requestId', async (c) => {
  const requestId = c.req.param('requestId');

  const query = 'SELECT * FROM traces WHERE request_id = ? ORDER BY start_time ASC';
  const result = await c.env.DB.prepare(query).bind(requestId).all();

  if (result.results.length === 0) {
    return c.json({ error: 'Trace not found for this request' }, 404);
  }

  return c.json({
    requestId,
    traces: result.results,
    total: result.results.length,
  });
});

tracesApp.get('/slow-traces', async (c) => {
  const { hours = '24', threshold = '2000', limit = '50' } = c.req.query() as Record<string, string>;

  const query = `
    SELECT * FROM traces
    WHERE
      duration_ms > ?
      AND start_time > datetime('now', '-' || ? || ' hours')
    ORDER BY duration_ms DESC
    LIMIT ?
  `;

  const result = await c.env.DB.prepare(query)
    .bind(Number(threshold), Number(hours), Number(limit))
    .all();

  return c.json({
    slowTraces: result.results,
    total: result.results.length,
    threshold: Number(threshold),
    hours: Number(hours),
    limit: Number(limit),
  });
});

tracesApp.get('/stats/duration', async (c) => {
  const { hours = '24' } = c.req.query() as Record<string, string>;

  const query = `
    SELECT
      COUNT(*) as total_traces,
      AVG(duration_ms) as avg_duration_ms,
      MIN(duration_ms) as min_duration_ms,
      MAX(duration_ms) as max_duration_ms
    FROM traces
    WHERE start_time > datetime('now', '-' || ? || ' hours')
  `;

  const result = await c.env.DB.prepare(query).bind(Number(hours)).first();

  return c.json({
    stats: result,
    hours: Number(hours),
  });
});

export default tracesApp;
