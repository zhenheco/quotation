/**
 * Local type definitions for observability library
 * These match Cloudflare Workers types but don't require @cloudflare/workers-types
 */

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
    changes?: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface AnalyticsEngineDataset {
  writeDataPoint(event: {
    indexes?: string[];
    blobs?: string[];
    doubles?: number[];
  }): void;
  sql?(options: { query: string }): Promise<{
    data: unknown[];
    meta: {
      name: string;
      type: string;
    }[];
    rows: number;
    rows_read: number;
    bytes_read: number;
  }>;
}
