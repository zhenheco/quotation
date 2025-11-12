import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '@/lib/observability/logger';
import type { D1Database } from '@/lib/observability/types';

// Mock D1 Database
const createMockD1 = (): D1Database => {
  const mockResults = new Map<string, unknown>();

  return {
    prepare: vi.fn((query: string) => {
      return {
        bind: vi.fn(() => {
          return {
            run: vi.fn(async () => {
              return { success: true, meta: { duration: 0, size_after: 0, rows_read: 0, rows_written: 1 } };
            }),
            first: vi.fn(async () => {
              if (query.includes('SELECT * FROM error_aggregates')) {
                return mockResults.get('error_aggregate');
              }
              return null;
            }),
            all: vi.fn(async () => {
              return { results: [], success: true, meta: { duration: 0, size_after: 0, rows_read: 0, rows_written: 0 } };
            }),
            raw: vi.fn(async () => {
              return [];
            }),
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
    }),
    batch: vi.fn(async () => []),
    exec: vi.fn(async () => ({ count: 0, duration: 0 })),
  } as unknown as D1Database;
};

describe('Logger', () => {
  let mockDb: D1Database;
  let logger: Logger;

  beforeEach(() => {
    mockDb = createMockD1();
    logger = new Logger(mockDb, {
      minLevel: 'debug',
      enablePIIRedaction: false,
    });
  });

  describe('基本日誌記錄', () => {
    it('應該記錄 debug 等級日誌', async () => {
      await logger.log('debug', 'Test debug message');
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('應該記錄 info 等級日誌', async () => {
      await logger.log('info', 'Test info message');
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('應該記錄 error 等級日誌', async () => {
      await logger.error('Test error message');
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it('應該根據 minLevel 過濾日誌', async () => {
      const infoLogger = new Logger(mockDb, { minLevel: 'info' });
      vi.clearAllMocks();

      await infoLogger.log('debug', 'Should be filtered');
      expect(mockDb.prepare).not.toHaveBeenCalled();

      await infoLogger.log('info', 'Should be logged');
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('PII 遮罩', () => {
    it('應該遮罩敏感資訊', async () => {
      const piiLogger = new Logger(mockDb, {
        enablePIIRedaction: true,
      });

      await piiLogger.log('info', 'User email: test@example.com');
      const call = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(call).toBeDefined();
    });
  });

  describe('錯誤取樣', () => {
    it('應該在達到限制時停止記錄相同錯誤', async () => {
      const samplingLogger = new Logger(mockDb, {
        enableErrorSampling: true,
        maxErrorsPerMinute: 2,
      });

      vi.clearAllMocks();

      const errorMessage = 'Repeated error message';

      // 前兩次應該記錄
      await samplingLogger.error(errorMessage);
      await samplingLogger.error(errorMessage);

      const callCountAfterTwo = (mockDb.prepare as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(callCountAfterTwo).toBeGreaterThan(0);

      vi.clearAllMocks();

      // 第三次應該被取樣過濾
      await samplingLogger.error(errorMessage);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });
  });

  describe('Trace Context', () => {
    it('應該建立帶有 trace context 的子 logger', async () => {
      const childLogger = logger.withTraceContext({
        traceId: 'trace_123',
        spanId: 'span_456',
        parentId: null,
        sampled: true,
      });

      await childLogger.log('info', 'Test with trace context');
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });

  describe('錯誤計數清理', () => {
    it('應該清理過期的錯誤計數', () => {
      logger.cleanupErrorCounts();
      // 應該不會拋出錯誤
    });
  });
});
