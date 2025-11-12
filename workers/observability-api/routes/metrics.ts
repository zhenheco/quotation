/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../types/analytics.d.ts" />
/* eslint-enable @typescript-eslint/triple-slash-reference */
import { Hono } from 'hono';

export interface Env {
  DB: D1Database;
  ANALYTICS?: AnalyticsEngineDataset;
}

const metricsApp = new Hono<{ Bindings: Env }>();

metricsApp.get('/api-requests', async (c) => {
  const { hours = '24' } = c.req.query() as Record<string, string>;

  if (!c.env.ANALYTICS) {
    return c.json({ error: 'Analytics Engine not configured' }, 503);
  }

  const query = `
    SELECT
      index1 as endpoint,
      blob1 as method,
      index3 as status_class,
      SUM(_sample_interval) as request_count,
      AVG(double1) as avg_response_time_ms,
      quantile(0.5)(double1) as p50_response_time_ms,
      quantile(0.95)(double1) as p95_response_time_ms,
      quantile(0.99)(double1) as p99_response_time_ms
    FROM analytics
    WHERE timestamp > NOW() - INTERVAL '${Number(hours)}' HOUR
    GROUP BY endpoint, method, status_class
    ORDER BY request_count DESC
  `;

  try {
    const result = await c.env.ANALYTICS.sql({ query });
    return c.json({
      metrics: result.data,
      hours: Number(hours),
    });
  } catch (error) {
    return c.json({
      error: 'Failed to query Analytics Engine',
      message: (error as Error).message,
    }, 500);
  }
});

metricsApp.get('/endpoint/:endpoint', async (c) => {
  const endpoint = c.req.param('endpoint');
  const { hours = '24' } = c.req.query() as Record<string, string>;

  if (!c.env.ANALYTICS) {
    return c.json({ error: 'Analytics Engine not configured' }, 503);
  }

  const query = `
    SELECT
      blob1 as method,
      index3 as status_class,
      SUM(_sample_interval) as request_count,
      AVG(double1) as avg_response_time_ms,
      quantile(0.5)(double1) as p50_response_time_ms,
      quantile(0.95)(double1) as p95_response_time_ms,
      quantile(0.99)(double1) as p99_response_time_ms,
      MAX(double1) as max_response_time_ms,
      MIN(double1) as min_response_time_ms
    FROM analytics
    WHERE
      index1 = '${endpoint}'
      AND timestamp > NOW() - INTERVAL '${Number(hours)}' HOUR
    GROUP BY method, status_class
    ORDER BY request_count DESC
  `;

  try {
    const result = await c.env.ANALYTICS.sql({ query });
    return c.json({
      endpoint,
      metrics: result.data,
      hours: Number(hours),
    });
  } catch (error) {
    return c.json({
      error: 'Failed to query Analytics Engine',
      message: (error as Error).message,
    }, 500);
  }
});

metricsApp.get('/timeseries', async (c) => {
  const { hours = '24', interval = '1h', endpoint } = c.req.query() as Record<string, string>;

  if (!c.env.ANALYTICS) {
    return c.json({ error: 'Analytics Engine not configured' }, 503);
  }

  const endpointFilter = endpoint ? `AND index1 = '${endpoint}'` : '';

  const query = `
    SELECT
      toStartOfInterval(timestamp, INTERVAL '${interval}') as time_bucket,
      SUM(_sample_interval) as request_count,
      AVG(double1) as avg_response_time_ms,
      quantile(0.95)(double1) as p95_response_time_ms,
      COUNT(CASE WHEN index3 = '5xx' THEN 1 END) as error_count
    FROM analytics
    WHERE
      timestamp > NOW() - INTERVAL '${Number(hours)}' HOUR
      ${endpointFilter}
    GROUP BY time_bucket
    ORDER BY time_bucket ASC
  `;

  try {
    const result = await c.env.ANALYTICS.sql({ query });
    return c.json({
      timeseries: result.data,
      hours: Number(hours),
      interval,
      endpoint,
    });
  } catch (error) {
    return c.json({
      error: 'Failed to query Analytics Engine',
      message: (error as Error).message,
    }, 500);
  }
});

metricsApp.get('/error-rate', async (c) => {
  const { hours = '24' } = c.req.query() as Record<string, string>;

  if (!c.env.ANALYTICS) {
    return c.json({ error: 'Analytics Engine not configured' }, 503);
  }

  const query = `
    SELECT
      SUM(CASE WHEN index3 = '5xx' THEN _sample_interval ELSE 0 END) as error_count,
      SUM(CASE WHEN index3 = '4xx' THEN _sample_interval ELSE 0 END) as client_error_count,
      SUM(CASE WHEN index3 = '2xx' THEN _sample_interval ELSE 0 END) as success_count,
      SUM(_sample_interval) as total_requests
    FROM analytics
    WHERE timestamp > NOW() - INTERVAL '${Number(hours)}' HOUR
  `;

  try {
    const result = await c.env.ANALYTICS.sql({ query });
    const data = result.data[0] as {
      error_count: number;
      client_error_count: number;
      success_count: number;
      total_requests: number;
    };

    const errorRate = data.total_requests > 0 ? (data.error_count / data.total_requests) * 100 : 0;
    const clientErrorRate = data.total_requests > 0 ? (data.client_error_count / data.total_requests) * 100 : 0;
    const successRate = data.total_requests > 0 ? (data.success_count / data.total_requests) * 100 : 0;

    return c.json({
      ...data,
      error_rate: errorRate,
      client_error_rate: clientErrorRate,
      success_rate: successRate,
      hours: Number(hours),
    });
  } catch (error) {
    return c.json({
      error: 'Failed to query Analytics Engine',
      message: (error as Error).message,
    }, 500);
  }
});

metricsApp.get('/top-slow-endpoints', async (c) => {
  const { hours = '24', limit = '10' } = c.req.query() as Record<string, string>;

  if (!c.env.ANALYTICS) {
    return c.json({ error: 'Analytics Engine not configured' }, 503);
  }

  const query = `
    SELECT
      index1 as endpoint,
      AVG(double1) as avg_response_time_ms,
      quantile(0.95)(double1) as p95_response_time_ms,
      SUM(_sample_interval) as request_count
    FROM analytics
    WHERE timestamp > NOW() - INTERVAL '${Number(hours)}' HOUR
    GROUP BY endpoint
    ORDER BY p95_response_time_ms DESC
    LIMIT ${Number(limit)}
  `;

  try {
    const result = await c.env.ANALYTICS.sql({ query });
    return c.json({
      endpoints: result.data,
      hours: Number(hours),
      limit: Number(limit),
    });
  } catch (error) {
    return c.json({
      error: 'Failed to query Analytics Engine',
      message: (error as Error).message,
    }, 500);
  }
});

metricsApp.get('/errors/aggregated', async (c) => {
  const { hours = '24', limit = '50' } = c.req.query() as Record<string, string>;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (hours) {
    conditions.push("last_seen >= datetime('now', '-' || ? || ' hours')");
    params.push(Number(hours));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      fingerprint,
      message,
      count,
      first_seen,
      last_seen,
      resolved
    FROM error_aggregates
    ${whereClause}
    ORDER BY last_seen DESC
    LIMIT ?
  `;

  const result = await c.env.DB.prepare(query).bind(...params, Number(limit)).all();

  return c.json({
    errors: result.results,
    total: result.results.length,
    hours: Number(hours),
    limit: Number(limit),
  });
});

export default metricsApp;
