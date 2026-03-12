import type { BulkActionResponse } from "@/types/bulk";

export async function runBulkAction(
  ids: string[],
  handler: (id: string) => Promise<unknown>,
): Promise<BulkActionResponse> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        await handler(id);
        return {
          id,
          success: true as const,
          message: null,
        };
      } catch (error) {
        return {
          id,
          success: false as const,
          message: error instanceof Error
            ? error.message
            : "Unexpected bulk action failure.",
        };
      }
    }),
  );

  const successIds = results.filter((result) => result.success).map((result) =>
    result.id
  );
  const failed = results.filter((result) => !result.success).map((result) => ({
    id: result.id,
    message: result.message ?? "Unexpected bulk action failure.",
  }));

  return {
    requestedCount: ids.length,
    successCount: successIds.length,
    failedCount: failed.length,
    successIds,
    failed,
  };
}
