export const DISCHARGE_SUMMARY_STATUS = ["DRAFT", "FINALIZED"] as const;

export type DischargeSummaryStatus = (typeof DISCHARGE_SUMMARY_STATUS)[number];
