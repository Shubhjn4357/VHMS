export type BulkActionFailure = {
  id: string;
  message: string;
};

export type BulkActionResponse = {
  requestedCount: number;
  successCount: number;
  failedCount: number;
  successIds: string[];
  failed: BulkActionFailure[];
};
