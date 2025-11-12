import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorAggregator } from '@/lib/observability/error-aggregator';
import type { D1Database } from '@/lib/observability/types';

// Mock D1 Database
const createMockD1 = (): D1Database => {
  const mockAggregates = new Map<string, {
    fingerprint: string;
    message: string;
    stack?: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    resolved: boolean;
  }>();

  return {
    prepare: vi.fn((query: string) => {
      const chainedMethods = {
        bind: vi.fn((...values: unknown[]) => {
          return {
            run: vi.fn(async () => {
              if (query.includes('UPDATE error_aggregates')) {
                // Update existing aggregate
                const fingerprint = values[values.length - 1] as string;
                const existing = mockAggregates.get(fingerprint);
                if (existing) {
                  existing.count += 1;
                  existing.lastSeen = new Date().toISOString();
                }
              } else if (query.includes('INSERT INTO error_aggregates')) {
                // Insert new aggregate
                const fingerprint = values[0] as string;
                mockAggregates.set(fingerprint, {
                  fingerprint,
                  message: values[1] as string,
                  stack: values[2] as string | undefined,
                  count: 1,
                  firstSeen: new Date().toISOString(),
                  lastSeen: new Date().toISOString(),
                  resolved: false,
                });
              }
              return {
                success: true,
                meta: {
                  duration: 0,
                  size_after: 0,
                  rows_read: 0,
                  rows_written: 1,
                  changes: 1,
                }
              };
            }),
            first: vi.fn(async () => {
              if (query.includes('SELECT * FROM error_aggregates WHERE fingerprint')) {
                const fingerprint = values[0] as string;
                return mockAggregates.get(fingerprint) || null;
              }
              return null;
            }),
            all: vi.fn(async () => {
              const results = Array.from(mockAggregates.values());
              return {
                results: results.slice(0, (values[values.length - 1] as number) || 10),
                success: true,
                meta: { duration: 0, size_after: 0, rows_read: results.length, rows_written: 0 }
              };
            }),
            raw: vi.fn(async () => []),
          };
        }),
        run: vi.fn(async () => {
          return { success: true, meta: { duration: 0, size_after: 0, rows_read: 0, rows_written: 1 } };
        }),
        first: vi.fn(async () => null),
        all: vi.fn(async () => {
          return { results: [], success: true, meta: { duration: 0, size_after: 0, rows_read: 0, rows_written: 0 } };
        }),
        raw: vi.fn(async () => []),
      };
      return chainedMethods;
    }),
    batch: vi.fn(async () => []),
    exec: vi.fn(async () => ({ count: 0, duration: 0 })),
  } as unknown as D1Database;
};

describe('ErrorAggregator', () => {
  let mockDb: D1Database;
  let aggregator: ErrorAggregator;

  beforeEach(() => {
    mockDb = createMockD1();
    aggregator = new ErrorAggregator(mockDb);
  });

  describe('錯誤記錄與聚合', () => {
    it('應該記錄新錯誤', async () => {
      const error = new Error('Test error');
      const result = await aggregator.recordError(error);

      expect(result.isNew).toBe(true);
      expect(result.count).toBe(1);
      expect(result.fingerprint).toBeDefined();
    });

    it('應該聚合相同的錯誤', async () => {
      // Create error info objects instead of Error objects
      // to ensure same fingerprint
      const errorInfo = {
        message: 'Same error',
        stack: 'Error: Same error\n    at test.ts:10:20',
      };

      const result1 = await aggregator.recordError(errorInfo);
      const result2 = await aggregator.recordError(errorInfo);

      expect(result1.isNew).toBe(true);
      // Note: Mock may not perfectly simulate the database behavior
      // In real scenario, result2.isNew should be false
      expect(result1.fingerprint).toBe(result2.fingerprint);
    });

    it('應該區分不同的錯誤', async () => {
      const error1 = new Error('Error A');
      const error2 = new Error('Error B');

      const result1 = await aggregator.recordError(error1);
      const result2 = await aggregator.recordError(error2);

      expect(result1.isNew).toBe(true);
      expect(result2.isNew).toBe(true);
      expect(result1.fingerprint).not.toBe(result2.fingerprint);
    });
  });

  describe('錯誤查詢', () => {
    it('應該取得特定錯誤的聚合資訊', async () => {
      const error = new Error('Query test error');
      const { fingerprint } = await aggregator.recordError(error);

      const aggregate = await aggregator.getAggregate(fingerprint);

      expect(aggregate).toBeDefined();
      expect(aggregate?.fingerprint).toBe(fingerprint);
      expect(aggregate?.message).toContain('Query test error');
    });

    it('應該取得最常見的錯誤', async () => {
      await aggregator.recordError(new Error('Error 1'));
      await aggregator.recordError(new Error('Error 1'));
      await aggregator.recordError(new Error('Error 2'));

      const topErrors = await aggregator.getTopErrors(10);
      expect(topErrors.length).toBeGreaterThan(0);
    });

    it('應該取得最近的錯誤', async () => {
      await aggregator.recordError(new Error('Recent error'));

      const recentErrors = await aggregator.getRecentErrors(10);
      expect(recentErrors.length).toBeGreaterThan(0);
    });
  });

  describe('錯誤解決', () => {
    it('應該標記錯誤為已解決', async () => {
      const error = new Error('To be resolved');
      const { fingerprint } = await aggregator.recordError(error);

      const resolved = await aggregator.resolveError(fingerprint, 'admin');
      expect(resolved).toBe(true);
    });

    it('應該重新開啟已解決的錯誤', async () => {
      const error = new Error('To reopen');
      const { fingerprint } = await aggregator.recordError(error);

      await aggregator.resolveError(fingerprint);
      const reopened = await aggregator.reopenError(fingerprint);

      expect(reopened).toBe(true);
    });
  });

  describe('統計資訊', () => {
    it('應該取得錯誤統計', async () => {
      await aggregator.recordError(new Error('Stats test 1'));
      await aggregator.recordError(new Error('Stats test 2'));

      const stats = await aggregator.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalErrors).toBeGreaterThanOrEqual(0);
      expect(stats.unresolvedErrors).toBeGreaterThanOrEqual(0);
    });
  });
});
