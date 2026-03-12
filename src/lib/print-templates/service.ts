import { asc, eq } from "drizzle-orm";

import {
  getPrintTemplateDefinition,
  PRINT_TEMPLATE_KEYS,
  type PrintTemplateKey,
} from "@/constants/printConfig";
import { getDb } from "@/db/client";
import { printTemplateSections, users } from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import type {
  PrintTemplateRecord,
  PrintTemplateSectionRecord,
  PrintTemplateUpdateInput,
  PrintTemplateWorkspaceResponse,
} from "@/types/printTemplates";

function sortSections(sections: PrintTemplateSectionRecord[]) {
  return [...sections].sort((left, right) =>
    left.displayOrder - right.displayOrder ||
    left.defaultOrder - right.defaultOrder
  );
}

function buildDefaultTemplate(
  templateKey: PrintTemplateKey,
): PrintTemplateRecord {
  const definition = getPrintTemplateDefinition(templateKey);
  const sections = definition.sections.map((section) => ({
    key: section.key,
    label: section.label,
    description: section.description,
    displayOrder: section.defaultOrder,
    defaultOrder: section.defaultOrder,
  }));

  return {
    key: definition.key,
    label: definition.label,
    description: definition.description,
    paperLabel: definition.paperLabel,
    sections: sortSections(sections),
    customized: false,
    updatedAt: null,
    updatedByUserId: null,
    updatedByName: null,
  };
}

function normalizeTemplateInput(input: PrintTemplateUpdateInput) {
  const definition = getPrintTemplateDefinition(input.templateKey);
  const knownKeys = new Set(definition.sections.map((section) => section.key));
  const seen = new Set<string>();

  for (const section of input.sections) {
    if (!knownKeys.has(section.key)) {
      throw new ApiError(
        400,
        `Section ${section.key} does not belong to template ${input.templateKey}.`,
      );
    }

    if (seen.has(section.key)) {
      throw new ApiError(400, `Duplicate section ${section.key}.`);
    }

    seen.add(section.key);
  }

  const inputMap = new Map(
    input.sections.map((section) => [section.key, section]),
  );
  const merged = definition.sections.map((section) => ({
    key: section.key,
    label: section.label,
    description: section.description,
    defaultOrder: section.defaultOrder,
    displayOrder: inputMap.get(section.key)?.displayOrder ??
      section.defaultOrder,
  }));

  return sortSections(merged).map((section, index) => ({
    ...section,
    displayOrder: index,
  }));
}

export async function getResolvedPrintTemplate(
  templateKey: PrintTemplateKey,
): Promise<PrintTemplateRecord> {
  const db = getDb();
  const rows = await db
    .select({
      templateKey: printTemplateSections.templateKey,
      sectionKey: printTemplateSections.sectionKey,
      displayOrder: printTemplateSections.displayOrder,
      updatedByUserId: printTemplateSections.updatedByUserId,
      updatedAt: printTemplateSections.updatedAt,
      updatedByName: users.name,
    })
    .from(printTemplateSections)
    .leftJoin(users, eq(printTemplateSections.updatedByUserId, users.id))
    .where(eq(printTemplateSections.templateKey, templateKey))
    .orderBy(asc(printTemplateSections.displayOrder));

  if (rows.length === 0) {
    return buildDefaultTemplate(templateKey);
  }

  const definition = getPrintTemplateDefinition(templateKey);
  const rowMap = new Map(rows.map((row) => [row.sectionKey, row]));
  const latestRow = rows.reduce((latest, row) =>
    !latest || row.updatedAt > latest.updatedAt ? row : latest
  );

  const sections = sortSections(
    definition.sections.map((section) => ({
      key: section.key,
      label: section.label,
      description: section.description,
      displayOrder: rowMap.get(section.key)?.displayOrder ??
        section.defaultOrder,
      defaultOrder: section.defaultOrder,
    })),
  );

  return {
    key: definition.key,
    label: definition.label,
    description: definition.description,
    paperLabel: definition.paperLabel,
    sections,
    customized: true,
    updatedAt: latestRow?.updatedAt.toISOString() ?? null,
    updatedByUserId: latestRow?.updatedByUserId ?? null,
    updatedByName: latestRow?.updatedByName ?? null,
  };
}

export async function listPrintTemplateWorkspace(): Promise<
  PrintTemplateWorkspaceResponse
> {
  const templates = await Promise.all(
    PRINT_TEMPLATE_KEYS.map((templateKey) =>
      getResolvedPrintTemplate(templateKey)
    ),
  );

  return {
    templates,
    summary: {
      total: templates.length,
      customized: templates.filter((template) => template.customized).length,
      sections: templates.reduce(
        (sum, template) => sum + template.sections.length,
        0,
      ),
    },
  };
}

export async function updatePrintTemplate(
  input: PrintTemplateUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const sections = normalizeTemplateInput(input);
  const timestamp = new Date();

  for (const section of sections) {
    await db
      .insert(printTemplateSections)
      .values({
        templateKey: input.templateKey,
        sectionKey: section.key,
        displayOrder: section.displayOrder,
        updatedByUserId: actorUserId ?? null,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: [
          printTemplateSections.templateKey,
          printTemplateSections.sectionKey,
        ],
        set: {
          displayOrder: section.displayOrder,
          updatedByUserId: actorUserId ?? null,
          updatedAt: timestamp,
        },
      });
  }

  await recordAuditLog({
    actorUserId,
    action: "printTemplates.updated",
    entityType: "print_template",
    entityId: input.templateKey,
    metadata: {
      templateKey: input.templateKey,
      sections: sections.map((section) => ({
        key: section.key,
        displayOrder: section.displayOrder,
      })),
    },
  });

  return await getResolvedPrintTemplate(input.templateKey);
}

export async function resetPrintTemplate(
  templateKey: PrintTemplateKey,
  actorUserId?: string | null,
) {
  const db = getDb();

  await db.delete(printTemplateSections).where(
    eq(printTemplateSections.templateKey, templateKey),
  );

  await recordAuditLog({
    actorUserId,
    action: "printTemplates.reset",
    entityType: "print_template",
    entityId: templateKey,
    metadata: {
      templateKey,
    },
  });

  return buildDefaultTemplate(templateKey);
}
