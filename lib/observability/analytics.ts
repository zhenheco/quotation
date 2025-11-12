/**
 * Analytics Engine 整合
 * 用於業務 KPI 追蹤和效能指標收集
 */

import type { AnalyticsEngineDataset } from './types';

export interface AnalyticsEvent {
  indexes?: string[];
  blobs?: string[];
  doubles?: number[];
}

/**
 * Analytics 包裝器
 */
export class Analytics {
  constructor(private dataset?: AnalyticsEngineDataset) {}

  /**
   * 追蹤 API 請求
   */
  trackAPIRequest(
    endpoint: string,
    method: string,
    status: number,
    durationMs: number,
    options?: {
      userTier?: string;
      country?: string;
      dbQueryTimeMs?: number;
      responseSizeBytes?: number;
    }
  ): void {
    if (!this.dataset) return;

    const statusClass = `${Math.floor(status / 100)}xx`;

    try {
      this.dataset.writeDataPoint({
        indexes: [
          endpoint,
          options?.userTier || 'free',
          statusClass,
        ],
        blobs: [
          method,
          options?.country || 'unknown',
        ],
        doubles: [
          durationMs,
          options?.dbQueryTimeMs || 0,
          options?.responseSizeBytes || 0,
        ],
      });
    } catch (error) {
      console.error('Failed to write analytics data point:', error);
    }
  }

  /**
   * 追蹤業務事件：報價建立
   */
  trackQuotationCreated(
    amount: number,
    currency: string,
    customerType: string
  ): void {
    if (!this.dataset) return;

    try {
      this.dataset.writeDataPoint({
        indexes: ['quotation.created', currency, customerType],
        blobs: [],
        doubles: [amount],
      });
    } catch (error) {
      console.error('Failed to track quotation created:', error);
    }
  }

  /**
   * 追蹤業務事件：報價發送
   */
  trackQuotationSent(
    amount: number,
    currency: string,
    customerType: string
  ): void {
    if (!this.dataset) return;

    try {
      this.dataset.writeDataPoint({
        indexes: ['quotation.sent', currency, customerType],
        blobs: [],
        doubles: [amount],
      });
    } catch (error) {
      console.error('Failed to track quotation sent:', error);
    }
  }

  /**
   * 追蹤業務事件：報價接受
   */
  trackQuotationAccepted(
    amount: number,
    currency: string,
    conversionTimeHours: number
  ): void {
    if (!this.dataset) return;

    try {
      this.dataset.writeDataPoint({
        indexes: ['quotation.accepted', currency],
        blobs: [],
        doubles: [amount, conversionTimeHours],
      });
    } catch (error) {
      console.error('Failed to track quotation accepted:', error);
    }
  }

  /**
   * 追蹤業務事件：收款成功
   */
  trackPaymentReceived(
    amount: number,
    currency: string,
    paymentMethod: string
  ): void {
    if (!this.dataset) return;

    try {
      this.dataset.writeDataPoint({
        indexes: ['payment.received', currency, paymentMethod],
        blobs: [],
        doubles: [amount],
      });
    } catch (error) {
      console.error('Failed to track payment received:', error);
    }
  }

  /**
   * 追蹤業務事件：收款失敗
   */
  trackPaymentFailed(
    amount: number,
    currency: string,
    reason: string
  ): void {
    if (!this.dataset) return;

    try {
      this.dataset.writeDataPoint({
        indexes: ['payment.failed', currency, reason],
        blobs: [],
        doubles: [amount],
      });
    } catch (error) {
      console.error('Failed to track payment failed:', error);
    }
  }

  /**
   * 追蹤使用者登入
   */
  trackUserLogin(
    userTier: string,
    loginMethod: string
  ): void {
    if (!this.dataset) return;

    try {
      this.dataset.writeDataPoint({
        indexes: ['user.login', userTier, loginMethod],
        blobs: [],
        doubles: [1],
      });
    } catch (error) {
      console.error('Failed to track user login:', error);
    }
  }

  /**
   * 追蹤功能使用
   */
  trackFeatureUsed(
    featureName: string,
    userTier: string
  ): void {
    if (!this.dataset) return;

    try {
      this.dataset.writeDataPoint({
        indexes: ['feature.used', featureName, userTier],
        blobs: [],
        doubles: [1],
      });
    } catch (error) {
      console.error('Failed to track feature used:', error);
    }
  }

  /**
   * 通用事件追蹤
   */
  track(
    eventName: string,
    data: {
      indexes?: string[];
      blobs?: string[];
      doubles?: number[];
    }
  ): void {
    if (!this.dataset) return;

    try {
      this.dataset.writeDataPoint({
        indexes: [eventName, ...(data.indexes || [])],
        blobs: data.blobs || [],
        doubles: data.doubles || [],
      });
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }
}

/**
 * 建立 Analytics 實例
 */
export function createAnalytics(dataset?: AnalyticsEngineDataset): Analytics {
  return new Analytics(dataset);
}
