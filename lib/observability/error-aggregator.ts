/**
 * 錯誤聚合器
 * 用於追蹤和聚合相同的錯誤
 */

import type { D1Database } from './types';
import { getErrorFingerprint, extractErrorInfo, type ErrorInfo } from './error-fingerprint';

export interface ErrorAggregate {
  fingerprint: string;
  message: string;
  stack?: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export class ErrorAggregator {
  constructor(private db: D1Database) {}

  /**
   * 記錄錯誤並更新聚合統計
   */
  async recordError(error: Error | ErrorInfo): Promise<{
    fingerprint: string;
    isNew: boolean;
    count: number;
  }> {
    const errorInfo = error instanceof Error ? extractErrorInfo(error) : error;
    const fingerprint = await getErrorFingerprint(errorInfo);

    const existing = await this.db
      .prepare('SELECT * FROM error_aggregates WHERE fingerprint = ?')
      .bind(fingerprint)
      .first<ErrorAggregate>();

    if (existing) {
      await this.db
        .prepare(`
          UPDATE error_aggregates
          SET count = count + 1,
              last_seen = datetime('now')
          WHERE fingerprint = ?
        `)
        .bind(fingerprint)
        .run();

      return {
        fingerprint,
        isNew: false,
        count: existing.count + 1,
      };
    } else {
      await this.db
        .prepare(`
          INSERT INTO error_aggregates (fingerprint, message, stack, count, first_seen, last_seen, resolved)
          VALUES (?, ?, ?, 1, datetime('now'), datetime('now'), 0)
        `)
        .bind(fingerprint, errorInfo.message, errorInfo.stack || null)
        .run();

      return {
        fingerprint,
        isNew: true,
        count: 1,
      };
    }
  }

  /**
   * 取得錯誤聚合資訊
   */
  async getAggregate(fingerprint: string): Promise<ErrorAggregate | null> {
    const result = await this.db
      .prepare('SELECT * FROM error_aggregates WHERE fingerprint = ?')
      .bind(fingerprint)
      .first<ErrorAggregate>();

    return result || null;
  }

  /**
   * 取得最常見的錯誤
   */
  async getTopErrors(limit = 10, resolved = false): Promise<ErrorAggregate[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM error_aggregates
        WHERE resolved = ?
        ORDER BY count DESC, last_seen DESC
        LIMIT ?
      `)
      .bind(resolved ? 1 : 0, limit)
      .all<ErrorAggregate>();

    return result.results || [];
  }

  /**
   * 取得最近的錯誤
   */
  async getRecentErrors(limit = 10, resolved = false): Promise<ErrorAggregate[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM error_aggregates
        WHERE resolved = ?
        ORDER BY last_seen DESC
        LIMIT ?
      `)
      .bind(resolved ? 1 : 0, limit)
      .all<ErrorAggregate>();

    return result.results || [];
  }

  /**
   * 標記錯誤為已解決
   */
  async resolveError(fingerprint: string, resolvedBy?: string): Promise<boolean> {
    const result = await this.db
      .prepare(`
        UPDATE error_aggregates
        SET resolved = 1,
            resolved_at = datetime('now'),
            resolved_by = ?
        WHERE fingerprint = ?
      `)
      .bind(resolvedBy || null, fingerprint)
      .run();

    return result.success;
  }

  /**
   * 重新開啟已解決的錯誤
   */
  async reopenError(fingerprint: string): Promise<boolean> {
    const result = await this.db
      .prepare(`
        UPDATE error_aggregates
        SET resolved = 0,
            resolved_at = NULL,
            resolved_by = NULL
        WHERE fingerprint = ?
      `)
      .bind(fingerprint)
      .run();

    return result.success;
  }

  /**
   * 刪除舊的已解決錯誤
   */
  async cleanupResolvedErrors(daysAgo = 30): Promise<number> {
    const result = await this.db
      .prepare(`
        DELETE FROM error_aggregates
        WHERE resolved = 1
          AND resolved_at < datetime('now', '-' || ? || ' days')
      `)
      .bind(daysAgo)
      .run();

    return result.meta?.changes || 0;
  }

  /**
   * 取得錯誤統計
   */
  async getStats(): Promise<{
    totalErrors: number;
    unresolvedErrors: number;
    resolvedErrors: number;
    totalOccurrences: number;
  }> {
    const stats = await this.db
      .prepare(`
        SELECT
          COUNT(*) as total_errors,
          SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved_errors,
          SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved_errors,
          SUM(count) as total_occurrences
        FROM error_aggregates
      `)
      .first<{
        total_errors: number;
        unresolved_errors: number;
        resolved_errors: number;
        total_occurrences: number;
      }>();

    return {
      totalErrors: stats?.total_errors || 0,
      unresolvedErrors: stats?.unresolved_errors || 0,
      resolvedErrors: stats?.resolved_errors || 0,
      totalOccurrences: stats?.total_occurrences || 0,
    };
  }
}
