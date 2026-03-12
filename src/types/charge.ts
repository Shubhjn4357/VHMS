import type { ChargeCategoryKey } from "@/constants/chargeCategories";

export type ChargeRecord = {
  id: string;
  categoryId: string | null;
  categoryKey: ChargeCategoryKey | null;
  categoryLabel: string | null;
  name: string;
  code: string;
  unitPrice: number;
  taxable: boolean;
  active: boolean;
  createdAt: string;
};

export type ChargeFilters = {
  q?: string;
  category?: ChargeCategoryKey | "ALL";
  status?: "ALL" | "ACTIVE" | "INACTIVE";
};

export type ChargeSummary = {
  total: number;
  active: number;
  inactive: number;
  taxable: number;
};

export type ChargeListResponse = {
  entries: ChargeRecord[];
  summary: ChargeSummary;
  filters: {
    q: string;
    category: ChargeCategoryKey | "ALL";
    status: "ALL" | "ACTIVE" | "INACTIVE";
  };
};

export type ChargeUpsertInput = {
  categoryKey: ChargeCategoryKey;
  name: string;
  code: string;
  unitPrice: number;
  taxable: boolean;
  active: boolean;
};

export type ChargeUpdateInput = Partial<ChargeUpsertInput> & {
  id: string;
};

export type ChargeDeleteResponse = {
  id: string;
};
