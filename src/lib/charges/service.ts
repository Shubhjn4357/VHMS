import { asc, desc, eq } from "drizzle-orm";

import type { ChargeCategoryKey } from "@/constants/chargeCategories";
import { getDb } from "@/db/client";
import { billItems, chargeCategories, charges } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  ChargeFilters,
  ChargeListResponse,
  ChargeRecord,
  ChargeUpdateInput,
  ChargeUpsertInput,
} from "@/types/charge";

function toChargeRecord(row: {
  charges: typeof charges.$inferSelect;
  charge_categories: typeof chargeCategories.$inferSelect | null;
}): ChargeRecord {
  return {
    id: row.charges.id,
    categoryId: row.charges.categoryId ?? null,
    categoryKey:
      (row.charge_categories?.key as ChargeCategoryKey | undefined) ??
        null,
    categoryLabel: row.charge_categories?.label ?? null,
    name: row.charges.name,
    code: row.charges.code,
    unitPrice: row.charges.unitPrice,
    taxable: row.charges.taxable,
    active: row.charges.active,
    createdAt: row.charges.createdAt.toISOString(),
  };
}

function summarize(entries: ChargeRecord[]) {
  return {
    total: entries.length,
    active: entries.filter((entry) => entry.active).length,
    inactive: entries.filter((entry) => !entry.active).length,
    taxable: entries.filter((entry) => entry.taxable).length,
  };
}

async function resolveCategoryId(categoryKey: ChargeCategoryKey) {
  const db = getDb();
  const [categoryRow] = await db
    .select()
    .from(chargeCategories)
    .where(eq(chargeCategories.key, categoryKey))
    .limit(1);

  if (!categoryRow) {
    throw new ApiError(400, "Selected charge category does not exist.");
  }

  return categoryRow.id;
}

async function ensureUniqueChargeCode(code: string, ignoreId?: string) {
  const db = getDb();
  const [existingRow] = await db
    .select()
    .from(charges)
    .where(eq(charges.code, code))
    .limit(1);

  if (existingRow && existingRow.id !== ignoreId) {
    throw new ApiError(409, "Another charge already uses this code.");
  }
}

async function getChargeRecordById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(charges)
    .leftJoin(chargeCategories, eq(charges.categoryId, chargeCategories.id))
    .where(eq(charges.id, id))
    .limit(1);

  return row ? toChargeRecord(row) : null;
}

export async function listCharges(
  filters: ChargeFilters = {},
): Promise<ChargeListResponse> {
  const db = getDb();
  const rows = await db
    .select()
    .from(charges)
    .leftJoin(chargeCategories, eq(charges.categoryId, chargeCategories.id))
    .orderBy(desc(charges.active), asc(charges.name));

  const query = filters.q?.trim().toLowerCase() ?? "";
  const category = filters.category ?? "ALL";
  const status = filters.status ?? "ALL";
  const entries = rows
    .map(toChargeRecord)
    .filter((entry) => {
      const matchesCategory = category === "ALL" ||
        entry.categoryKey === category;
      const matchesStatus = status === "ALL" ||
        (status === "ACTIVE" && entry.active) ||
        (status === "INACTIVE" && !entry.active);

      if (!matchesCategory || !matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [entry.name, entry.code, entry.categoryLabel ?? ""].some((value) =>
        value.toLowerCase().includes(query)
      );
    });

  return {
    entries,
    summary: summarize(entries),
    filters: {
      q: query,
      category,
      status,
    },
  };
}

export async function createCharge(
  input: ChargeUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const code = input.code.trim().toUpperCase();
  await ensureUniqueChargeCode(code);
  const categoryId = await resolveCategoryId(input.categoryKey);

  await db.insert(charges).values({
    categoryId,
    name: input.name.trim(),
    code,
    unitPrice: input.unitPrice,
    taxable: input.taxable,
    active: input.active,
  });

  const [createdRow] = await db
    .select()
    .from(charges)
    .where(eq(charges.code, code))
    .limit(1);

  if (!createdRow) {
    throw new ApiError(500, "Unable to load the created charge.");
  }

  await recordAuditLog({
    actorUserId,
    action: "charges.created",
    entityType: "charge",
    entityId: createdRow.id,
    metadata: {
      code,
      categoryKey: input.categoryKey,
      unitPrice: input.unitPrice,
      active: input.active,
    },
  });

  const createdRecord = await getChargeRecordById(createdRow.id);

  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created charge.");
  }

  return createdRecord;
}

export async function updateCharge(
  input: ChargeUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingRow] = await db
    .select()
    .from(charges)
    .where(eq(charges.id, input.id))
    .limit(1);

  if (!existingRow) {
    throw new ApiError(404, "Charge not found.");
  }

  const nextCode = input.code?.trim().toUpperCase() ?? existingRow.code;
  await ensureUniqueChargeCode(nextCode, existingRow.id);

  const nextCategoryId = input.categoryKey
    ? await resolveCategoryId(input.categoryKey)
    : existingRow.categoryId;

  await db
    .update(charges)
    .set({
      categoryId: nextCategoryId,
      name: input.name?.trim() ?? existingRow.name,
      code: nextCode,
      unitPrice: input.unitPrice ?? existingRow.unitPrice,
      taxable: input.taxable ?? existingRow.taxable,
      active: input.active ?? existingRow.active,
    })
    .where(eq(charges.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "charges.updated",
    entityType: "charge",
    entityId: input.id,
    metadata: {
      code: nextCode,
      categoryId: nextCategoryId,
    },
  });

  const updatedRecord = await getChargeRecordById(input.id);

  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated charge.");
  }

  return updatedRecord;
}

export async function deleteCharge(
  id: string,
  actorUserId?: string | null,
) {
  const db = getDb();
  const [existingRow] = await db
    .select()
    .from(charges)
    .where(eq(charges.id, id))
    .limit(1);

  if (!existingRow) {
    throw new ApiError(404, "Charge not found.");
  }

  const linkedBillItemRows = await db
    .select({ id: billItems.id })
    .from(billItems)
    .where(eq(billItems.chargeId, id))
    .limit(1);

  if (linkedBillItemRows.length > 0) {
    throw new ApiError(
      409,
      "This charge is already used in bills. Set it inactive instead of deleting it.",
    );
  }

  await db.delete(charges).where(eq(charges.id, id));

  await recordAuditLog({
    actorUserId,
    action: "charges.deleted",
    entityType: "charge",
    entityId: id,
    metadata: {
      code: existingRow.code,
      name: existingRow.name,
    },
  });

  return { id };
}
