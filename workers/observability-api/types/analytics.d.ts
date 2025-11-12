/**
 * Augment the global AnalyticsEngineDataset interface with sql method
 */
interface AnalyticsEngineDataset {
  sql(options: { query: string }): Promise<{
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
