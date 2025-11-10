export interface AnalyticsEngine {
  writeDataPoint(event: {
    blobs?: string[]
    doubles?: number[]
    indexes?: string[]
  }): void
}

export class Analytics {
  constructor(private engine: AnalyticsEngine) {}

  trackQuotationCreated(userId: string, amount: number): void {
    try {
      this.engine.writeDataPoint({
        blobs: ['quotation_created'],
        doubles: [amount],
        indexes: [userId],
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }

  trackEmailSent(emailType: string, recipientCount: number): void {
    try {
      this.engine.writeDataPoint({
        blobs: ['email_sent', emailType],
        doubles: [recipientCount],
        indexes: [],
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }

  trackAPIRequest(endpoint: string, duration: number, statusCode: number): void {
    try {
      this.engine.writeDataPoint({
        blobs: ['api_request', endpoint],
        doubles: [duration, statusCode],
        indexes: [],
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }

  trackError(errorType: string, errorMessage: string): void {
    try {
      this.engine.writeDataPoint({
        blobs: ['error', errorType, errorMessage],
        doubles: [],
        indexes: [],
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }
}
