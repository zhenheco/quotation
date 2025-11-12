import { Hono } from 'hono';

export interface Env {
  DB: D1Database;
}

export interface LogQueryParams {
  level?: string;
  startTime?: string;
  endTime?: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
  path?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  request_id?: string;
  trace_id?: string;
  span_id?: string;
  user_id?: string;
  tenant_id?: string;
  path?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  env?: string;
}

const logsApp = new Hono<{ Bindings: Env }>();

logsApp.get('/', async (c) => {
  const {
    level,
    startTime,
    endTime,
    requestId,
    traceId,
    userId,
    path,
    search,
    limit = 100,
    offset = 0,
  } = c.req.query() as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (level) {
    conditions.push('level = ?');
    params.push(level);
  }

  if (startTime) {
    conditions.push('timestamp >= ?');
    params.push(startTime);
  }

  if (endTime) {
    conditions.push('timestamp <= ?');
    params.push(endTime);
  }

  if (requestId) {
    conditions.push('request_id = ?');
    params.push(requestId);
  }

  if (traceId) {
    conditions.push('trace_id = ?');
    params.push(traceId);
  }

  if (userId) {
    conditions.push('user_id = ?');
    params.push(userId);
  }

  if (path) {
    conditions.push('path LIKE ?');
    params.push(`%${path}%`);
  }

  if (search) {
    const searchQuery = `
      SELECT id FROM logs_fts
      WHERE logs_fts MATCH ?
      LIMIT ? OFFSET ?
    `;
    const ftsResult = await c.env.DB.prepare(searchQuery)
      .bind(search, Number(limit), Number(offset))
      .all();

    if (ftsResult.results.length === 0) {
      return c.json({ logs: [], total: 0, limit: Number(limit), offset: Number(offset) });
    }

    const ids = ftsResult.results.map((r) => (r as { id: string }).id);
    const placeholders = ids.map(() => '?').join(',');

    const query = `
      SELECT * FROM logs
      WHERE id IN (${placeholders})
      ORDER BY timestamp DESC
    `;

    const result = await c.env.DB.prepare(query).bind(...ids).all();

    return c.json({
      logs: result.results,
      total: result.results.length,
      limit: Number(limit),
      offset: Number(offset),
    });
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) as total FROM logs ${whereClause}`;
  const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
  const total = (countResult as { total: number } | null)?.total || 0;

  const query = `
    SELECT * FROM logs
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `;

  const result = await c.env.DB.prepare(query)
    .bind(...params, Number(limit), Number(offset))
    .all();

  return c.json({
    logs: result.results,
    total,
    limit: Number(limit),
    offset: Number(offset),
  });
});

logsApp.get('/:id', async (c) => {
  const id = c.req.param('id');

  const query = 'SELECT * FROM logs WHERE id = ?';
  const result = await c.env.DB.prepare(query).bind(id).first();

  if (!result) {
    return c.json({ error: 'Log not found' }, 404);
  }

  return c.json(result);
});

logsApp.get('/trace/:traceId', async (c) => {
  const traceId = c.req.param('traceId');
  const limit = Number(c.req.query('limit') || 1000);

  const query = `
    SELECT * FROM logs
    WHERE trace_id = ?
    ORDER BY timestamp ASC
    LIMIT ?
  `;

  const result = await c.env.DB.prepare(query).bind(traceId, limit).all();

  return c.json({
    traceId,
    logs: result.results,
    total: result.results.length,
  });
});

logsApp.get('/request/:requestId', async (c) => {
  const requestId = c.req.param('requestId');

  const query = `
    SELECT * FROM logs
    WHERE request_id = ?
    ORDER BY timestamp ASC
  `;

  const result = await c.env.DB.prepare(query).bind(requestId).all();

  return c.json({
    requestId,
    logs: result.results,
    total: result.results.length,
  });
});

logsApp.get('/stats/levels', async (c) => {
  const { startTime, endTime } = c.req.query() as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (startTime) {
    conditions.push('timestamp >= ?');
    params.push(startTime);
  }

  if (endTime) {
    conditions.push('timestamp <= ?');
    params.push(endTime);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT level, COUNT(*) as count
    FROM logs
    ${whereClause}
    GROUP BY level
    ORDER BY count DESC
  `;

  const result = await c.env.DB.prepare(query).bind(...params).all();

  return c.json({
    levels: result.results,
    total: result.results.reduce((sum, r) => sum + ((r as { count: number }).count || 0), 0),
  });
});

export default logsApp;
