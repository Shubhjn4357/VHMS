import { and, asc, eq } from "drizzle-orm";

import {
  type DashboardLayoutKey,
  type DashboardLayoutWidgetKey,
  getDashboardLayoutDefinitions,
} from "@/constants/dashboardLayouts";
import { getDb } from "@/db/client";
import { dashboardLayoutWidgets } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  DashboardLayoutRecord,
  DashboardLayoutUpdateInput,
  DashboardLayoutWidgetRecord,
} from "@/types/dashboardLayouts";

function sortWidgets(
  widgets: DashboardLayoutWidgetRecord[],
) {
  return [...widgets].sort((left, right) =>
    left.displayOrder - right.displayOrder ||
    left.defaultOrder - right.defaultOrder
  );
}

function buildDefaultLayout(
  layoutKey: DashboardLayoutKey,
): DashboardLayoutRecord {
  const widgets = getDashboardLayoutDefinitions(layoutKey).map((widget) => ({
    key: widget.key,
    label: widget.label,
    description: widget.description,
    displayOrder: widget.defaultOrder,
    defaultOrder: widget.defaultOrder,
    visible: true,
    gridSpan: widget.gridSpan,
  }));

  return {
    layoutKey,
    widgets: sortWidgets(widgets),
    updatedAt: null,
    summary: {
      total: widgets.length,
      visible: widgets.length,
      hidden: 0,
      customized: false,
    },
  };
}

function normalizeLayoutInput(
  input: DashboardLayoutUpdateInput,
) {
  const definitions = getDashboardLayoutDefinitions(input.layoutKey);
  const definitionMap = new Map(
    definitions.map((definition) => [definition.key, definition]),
  );
  const seen = new Set<DashboardLayoutWidgetKey>();

  for (const widget of input.widgets) {
    if (!definitionMap.has(widget.key)) {
      throw new ApiError(400, `Unknown dashboard widget: ${widget.key}`);
    }

    if (seen.has(widget.key)) {
      throw new ApiError(400, `Duplicate dashboard widget: ${widget.key}`);
    }

    seen.add(widget.key);
  }

  const orderedInput = [...input.widgets].sort((left, right) =>
    left.displayOrder - right.displayOrder
  );
  const inputMap = new Map(orderedInput.map((widget) => [widget.key, widget]));
  const merged = definitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    description: definition.description,
    defaultOrder: definition.defaultOrder,
    gridSpan: definition.gridSpan,
    displayOrder: inputMap.get(definition.key)?.displayOrder ??
      definition.defaultOrder,
    visible: inputMap.get(definition.key)?.visible ?? true,
  }));

  return sortWidgets(merged).map((widget, index) => ({
    ...widget,
    displayOrder: index,
  }));
}

export async function getDashboardLayout(
  userId: string,
  layoutKey: DashboardLayoutKey,
): Promise<DashboardLayoutRecord> {
  const db = getDb();
  const rows = await db
    .select()
    .from(dashboardLayoutWidgets)
    .where(
      and(
        eq(dashboardLayoutWidgets.userId, userId),
        eq(dashboardLayoutWidgets.layoutKey, layoutKey),
      ),
    )
    .orderBy(asc(dashboardLayoutWidgets.displayOrder));

  if (rows.length === 0) {
    return buildDefaultLayout(layoutKey);
  }

  const definitions = getDashboardLayoutDefinitions(layoutKey);
  const rowMap = new Map(rows.map((row) => [row.widgetKey, row]));
  const widgets = sortWidgets(
    definitions.map((definition) => ({
      key: definition.key,
      label: definition.label,
      description: definition.description,
      displayOrder: rowMap.get(definition.key)?.displayOrder ??
        definition.defaultOrder,
      defaultOrder: definition.defaultOrder,
      visible: rowMap.get(definition.key)?.visible ?? true,
      gridSpan: definition.gridSpan,
    })),
  );

  const updatedAt = rows.reduce<Date | null>((latest, row) => {
    if (!latest || row.updatedAt > latest) {
      return row.updatedAt;
    }

    return latest;
  }, null);

  return {
    layoutKey,
    widgets,
    updatedAt: updatedAt?.toISOString() ?? null,
    summary: {
      total: widgets.length,
      visible: widgets.filter((widget) => widget.visible).length,
      hidden: widgets.filter((widget) => !widget.visible).length,
      customized: true,
    },
  };
}

export async function saveDashboardLayout(
  userId: string,
  input: DashboardLayoutUpdateInput,
) {
  const db = getDb();
  const widgets = normalizeLayoutInput(input);
  const timestamp = new Date();

  for (const widget of widgets) {
    await db
      .insert(dashboardLayoutWidgets)
      .values({
        userId,
        layoutKey: input.layoutKey,
        widgetKey: widget.key,
        displayOrder: widget.displayOrder,
        visible: widget.visible,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [
          dashboardLayoutWidgets.userId,
          dashboardLayoutWidgets.layoutKey,
          dashboardLayoutWidgets.widgetKey,
        ],
        set: {
          displayOrder: widget.displayOrder,
          visible: widget.visible,
          updatedAt: timestamp,
        },
      });
  }

  await recordAuditLog({
    actorUserId: userId,
    action: "dashboardLayouts.saved",
    entityType: "dashboard_layout",
    entityId: input.layoutKey,
    metadata: {
      layoutKey: input.layoutKey,
      widgetOrder: widgets.map((widget) => ({
        key: widget.key,
        visible: widget.visible,
        displayOrder: widget.displayOrder,
      })),
    },
  });

  return await getDashboardLayout(userId, input.layoutKey);
}

export async function resetDashboardLayout(
  userId: string,
  layoutKey: DashboardLayoutKey,
) {
  const db = getDb();

  await db.delete(dashboardLayoutWidgets).where(
    and(
      eq(dashboardLayoutWidgets.userId, userId),
      eq(dashboardLayoutWidgets.layoutKey, layoutKey),
    ),
  );

  await recordAuditLog({
    actorUserId: userId,
    action: "dashboardLayouts.reset",
    entityType: "dashboard_layout",
    entityId: layoutKey,
    metadata: {
      layoutKey,
    },
  });

  return buildDefaultLayout(layoutKey);
}
