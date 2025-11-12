import { Hono } from 'hono';
import { cors } from 'hono/cors';
import logsApp from './routes/logs';
import metricsApp from './routes/metrics';
import tracesApp from './routes/traces';
import alertsApp from './routes/alerts';
import alertEvaluator from './cron/alert-evaluator';

export interface Env {
  DB: D1Database;
  ANALYTICS?: AnalyticsEngineDataset;
  ENVIRONMENT?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'development',
  });
});

app.get('/', (c) => {
  return c.json({
    service: 'Observability API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      logs: '/api/logs',
      metrics: '/api/metrics',
      traces: '/api/traces',
      alerts: '/api/alerts',
    },
    documentation: 'https://github.com/your-org/quotation-system/blob/main/workers/observability-api/README.md',
  });
});

app.route('/api/logs', logsApp);
app.route('/api/metrics', metricsApp);
app.route('/api/traces', tracesApp);
app.route('/api/alerts', alertsApp);

const worker = {
  fetch: app.fetch,
  scheduled: alertEvaluator.scheduled,
};

export default worker;
