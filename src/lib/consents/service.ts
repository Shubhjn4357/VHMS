import { asc, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  admissions,
  consentDocuments,
  consentSignatures,
  consentTemplates,
  doctors,
  patients,
} from "@/db/schema";
import { recordAuditLog } from "@/lib/audit/log";
import { ApiError } from "@/lib/api/errors";
import { listAdmissionLookups } from "@/lib/clinical/lookups";
import type {
  ConsentDocumentCreateInput,
  ConsentDocumentRecord,
  ConsentDocumentStatusUpdateInput,
  ConsentFilters,
  ConsentSignatureCreateInput,
  ConsentSignatureRecord,
  ConsentTemplateRecord,
  ConsentTemplateUpdateInput,
  ConsentTemplateUpsertInput,
  ConsentWorkspaceResponse,
} from "@/types/consent";

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toTemplateRecord(
  row: typeof consentTemplates.$inferSelect,
): ConsentTemplateRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    body: row.body,
    requiresWitness: row.requiresWitness,
    requiresDoctor: row.requiresDoctor,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSignatureRecord(
  row: typeof consentSignatures.$inferSelect,
): ConsentSignatureRecord {
  return {
    id: row.id,
    signerRole: row.signerRole,
    signerName: row.signerName,
    mode: row.mode,
    notes: row.notes ?? null,
    signedAt: row.signedAt.toISOString(),
  };
}

function summarize(
  templates: ConsentTemplateRecord[],
  documents: ConsentDocumentRecord[],
) {
  return {
    templates: templates.length,
    activeTemplates: templates.filter((template) => template.active).length,
    documents: documents.length,
    draftDocuments: documents.filter((document) => document.status === "draft")
      .length,
    pendingSignatureDocuments:
      documents.filter((document) => document.status === "pending_signature")
        .length,
    signedDocuments:
      documents.filter((document) => document.status === "signed")
        .length,
  };
}

async function ensureUniqueSlug(slug: string, ignoreId?: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(consentTemplates)
    .where(eq(consentTemplates.slug, slug))
    .limit(1);

  if (existing && existing.id !== ignoreId) {
    throw new ApiError(409, "Another consent template already uses this slug.");
  }
}

async function getTemplateEntityById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(consentTemplates)
    .where(eq(consentTemplates.id, id))
    .limit(1);

  return row ?? null;
}

async function assertPatientExists(patientId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);

  if (!row) {
    throw new ApiError(400, "Selected patient does not exist.");
  }

  return row;
}

async function assertAdmissionMatchesPatient(
  admissionId: string | undefined,
  patientId: string,
) {
  if (!admissionId) {
    return {
      admission: null as typeof admissions.$inferSelect | null,
      doctor: null as typeof doctors.$inferSelect | null,
    };
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(admissions)
    .leftJoin(doctors, eq(admissions.attendingDoctorId, doctors.id))
    .where(eq(admissions.id, admissionId))
    .limit(1);

  if (!row) {
    throw new ApiError(400, "Selected admission does not exist.");
  }

  if (row.admissions.patientId !== patientId) {
    throw new ApiError(
      400,
      "Selected admission does not belong to the chosen patient.",
    );
  }

  return { admission: row.admissions, doctor: row.doctors ?? null };
}

function renderTemplateBody(input: {
  templateBody: string;
  patientName: string;
  patientHospitalNumber: string;
  procedureName?: string | null;
  doctorName?: string | null;
}) {
  return input.templateBody
    .replaceAll("{{patientName}}", input.patientName)
    .replaceAll("{{patientHospitalNumber}}", input.patientHospitalNumber)
    .replaceAll(
      "{{procedureName}}",
      input.procedureName ?? "the proposed procedure",
    )
    .replaceAll("{{doctorName}}", input.doctorName ?? "the attending doctor");
}

async function listDocumentRecords(): Promise<ConsentDocumentRecord[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(consentDocuments)
    .innerJoin(
      consentTemplates,
      eq(consentDocuments.templateId, consentTemplates.id),
    )
    .innerJoin(patients, eq(consentDocuments.patientId, patients.id))
    .orderBy(desc(consentDocuments.updatedAt));

  const documentIds = rows.map((row) => row.consent_documents.id);
  const signatureRows = documentIds.length > 0
    ? await db
      .select()
      .from(consentSignatures)
      .where(inArray(consentSignatures.consentDocumentId, documentIds))
      .orderBy(asc(consentSignatures.signedAt))
    : [];

  const signaturesByDocumentId = signatureRows.reduce((map, row) => {
    const entries = map.get(row.consentDocumentId) ?? [];
    entries.push(toSignatureRecord(row));
    map.set(row.consentDocumentId, entries);
    return map;
  }, new Map<string, ConsentSignatureRecord[]>());

  return rows.map((row) => ({
    id: row.consent_documents.id,
    templateId: row.consent_templates.id,
    templateName: row.consent_templates.name,
    patientId: row.patients.id,
    patientName: [row.patients.firstName, row.patients.lastName].filter(Boolean)
      .join(" "),
    patientHospitalNumber: row.patients.hospitalNumber,
    admissionId: row.consent_documents.admissionId ?? null,
    procedureName: row.consent_documents.procedureName ?? null,
    status: row.consent_documents.status,
    renderedBody: row.consent_documents.renderedBody,
    requiresWitness: row.consent_documents.requiresWitness,
    requiresDoctor: row.consent_documents.requiresDoctor,
    finalizedAt: toIsoString(row.consent_documents.finalizedAt ?? null),
    createdAt: row.consent_documents.createdAt.toISOString(),
    updatedAt: row.consent_documents.updatedAt.toISOString(),
    signatures: signaturesByDocumentId.get(row.consent_documents.id) ?? [],
  }));
}

async function getDocumentEntityById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(consentDocuments)
    .where(eq(consentDocuments.id, id))
    .limit(1);

  return row ?? null;
}

async function getDocumentRecordById(id: string) {
  const records = await listDocumentRecords();
  return records.find((record) => record.id === id) ?? null;
}

export async function getConsentDocumentById(id: string) {
  return getDocumentRecordById(id);
}

function computeSignedStatus(
  document: typeof consentDocuments.$inferSelect,
  signatures: ConsentSignatureRecord[],
) {
  const roles = new Set(signatures.map((signature) => signature.signerRole));
  const patientSigned = roles.has("PATIENT");
  const witnessSigned = !document.requiresWitness || roles.has("WITNESS");
  const doctorSigned = !document.requiresDoctor || roles.has("DOCTOR");

  return patientSigned && witnessSigned && doctorSigned;
}

export async function listConsentWorkspace(
  filters: ConsentFilters = {},
): Promise<ConsentWorkspaceResponse> {
  const db = getDb();
  const [templateRows, documentRecords, admissionsLookup] = await Promise.all([
    db.select().from(consentTemplates).orderBy(
      desc(consentTemplates.active),
      asc(consentTemplates.name),
    ),
    listDocumentRecords(),
    listAdmissionLookups(),
  ]);

  const templates = templateRows.map(toTemplateRecord);
  const query = filters.q?.trim().toLowerCase() ?? "";
  const status = filters.status ?? "ALL";
  const documents = documentRecords.filter((document) => {
    if (status !== "ALL" && document.status !== status) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      document.templateName,
      document.patientName,
      document.patientHospitalNumber,
      document.procedureName ?? "",
      document.status,
    ].some((value) => value.toLowerCase().includes(query));
  });

  return {
    templates,
    documents,
    admissions: admissionsLookup,
    summary: summarize(templates, documents),
    filters: {
      q: query,
      status,
    },
  };
}

export async function createConsentTemplate(
  input: ConsentTemplateUpsertInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const slug = input.slug.trim().toLowerCase();
  await ensureUniqueSlug(slug);

  const [created] = await db
    .insert(consentTemplates)
    .values({
      name: input.name.trim(),
      slug,
      category: input.category.trim(),
      body: input.body.trim(),
      requiresWitness: input.requiresWitness,
      requiresDoctor: input.requiresDoctor,
      active: input.active,
    })
    .returning({ id: consentTemplates.id });

  if (!created) {
    throw new ApiError(500, "Unable to create the consent template.");
  }

  await recordAuditLog({
    actorUserId,
    action: "consent.template.created",
    entityType: "consent_template",
    entityId: created.id,
    metadata: {
      slug,
      category: input.category.trim(),
    },
  });

  const createdTemplate = await getTemplateEntityById(created.id);
  if (!createdTemplate) {
    throw new ApiError(500, "Unable to load the created consent template.");
  }

  return toTemplateRecord(createdTemplate);
}

export async function updateConsentTemplate(
  input: ConsentTemplateUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await getTemplateEntityById(input.id);

  if (!existing) {
    throw new ApiError(404, "Consent template not found.");
  }

  const nextSlug = input.slug?.trim().toLowerCase() ?? existing.slug;
  await ensureUniqueSlug(nextSlug, existing.id);

  await db
    .update(consentTemplates)
    .set({
      name: input.name?.trim() ?? existing.name,
      slug: nextSlug,
      category: input.category?.trim() ?? existing.category,
      body: input.body?.trim() ?? existing.body,
      requiresWitness: input.requiresWitness ?? existing.requiresWitness,
      requiresDoctor: input.requiresDoctor ?? existing.requiresDoctor,
      active: input.active ?? existing.active,
      updatedAt: new Date(),
    })
    .where(eq(consentTemplates.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: "consent.template.updated",
    entityType: "consent_template",
    entityId: input.id,
    metadata: {
      slug: nextSlug,
    },
  });

  const updatedTemplate = await getTemplateEntityById(input.id);
  if (!updatedTemplate) {
    throw new ApiError(500, "Unable to load the updated consent template.");
  }

  return toTemplateRecord(updatedTemplate);
}

export async function createConsentDocument(
  input: ConsentDocumentCreateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const template = await getTemplateEntityById(input.templateId);

  if (!template || !template.active) {
    throw new ApiError(400, "Selected consent template is unavailable.");
  }

  const patient = await assertPatientExists(input.patientId);
  const { doctor } = await assertAdmissionMatchesPatient(
    input.admissionId?.trim() || undefined,
    input.patientId,
  );

  const [created] = await db
    .insert(consentDocuments)
    .values({
      templateId: template.id,
      patientId: patient.id,
      admissionId: input.admissionId?.trim() || null,
      procedureName: input.procedureName?.trim() || null,
      status: "draft",
      renderedBody: renderTemplateBody({
        templateBody: template.body,
        patientName: [patient.firstName, patient.lastName].filter(Boolean).join(
          " ",
        ),
        patientHospitalNumber: patient.hospitalNumber,
        procedureName: input.procedureName?.trim() || null,
        doctorName: doctor?.fullName ?? null,
      }),
      requiresWitness: template.requiresWitness,
      requiresDoctor: template.requiresDoctor,
      createdByUserId: actorUserId ?? null,
    })
    .returning({ id: consentDocuments.id });

  if (!created) {
    throw new ApiError(500, "Unable to create the consent document.");
  }

  await recordAuditLog({
    actorUserId,
    action: "consent.document.created",
    entityType: "consent_document",
    entityId: created.id,
    metadata: {
      templateId: template.id,
      patientId: patient.id,
      admissionId: input.admissionId?.trim() || null,
    },
  });

  const createdRecord = await getDocumentRecordById(created.id);
  if (!createdRecord) {
    throw new ApiError(500, "Unable to load the created consent document.");
  }

  return createdRecord;
}

export async function updateConsentDocumentStatus(
  input: ConsentDocumentStatusUpdateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await getDocumentEntityById(input.id);

  if (!existing) {
    throw new ApiError(404, "Consent document not found.");
  }

  if (existing.status === "signed" && input.action !== "REVOKE") {
    throw new ApiError(409, "Signed consent documents cannot change state.");
  }

  const nextStatus = input.action === "REQUEST_SIGNATURE"
    ? "pending_signature"
    : input.action === "DECLINE"
    ? "declined"
    : "revoked";

  await db
    .update(consentDocuments)
    .set({
      status: nextStatus,
      finalizedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(consentDocuments.id, input.id));

  await recordAuditLog({
    actorUserId,
    action: `consent.document.${nextStatus}`,
    entityType: "consent_document",
    entityId: input.id,
  });

  const updatedRecord = await getDocumentRecordById(input.id);
  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the updated consent document.");
  }

  return updatedRecord;
}

export async function signConsentDocument(
  input: ConsentSignatureCreateInput,
  actorUserId?: string | null,
) {
  const db = getDb();
  const existing = await getDocumentEntityById(input.consentDocumentId);

  if (!existing) {
    throw new ApiError(404, "Consent document not found.");
  }

  if (["declined", "expired", "revoked"].includes(existing.status)) {
    throw new ApiError(409, "This consent document can no longer be signed.");
  }

  const existingSignatures = await db
    .select()
    .from(consentSignatures)
    .where(eq(consentSignatures.consentDocumentId, input.consentDocumentId));

  if (
    existingSignatures.some((signature) =>
      signature.signerRole === input.signerRole
    )
  ) {
    throw new ApiError(
      409,
      `A ${input.signerRole.toLowerCase()} signature already exists for this consent.`,
    );
  }

  await db.insert(consentSignatures).values({
    consentDocumentId: input.consentDocumentId,
    signerRole: input.signerRole,
    signerName: input.signerName.trim(),
    mode: input.mode,
    notes: input.notes?.trim() || null,
  });

  const signatureRecords = [
    ...existingSignatures.map(toSignatureRecord),
    {
      id: "__pending__",
      signerRole: input.signerRole,
      signerName: input.signerName.trim(),
      mode: input.mode,
      notes: input.notes?.trim() || null,
      signedAt: new Date().toISOString(),
    } satisfies ConsentSignatureRecord,
  ];

  const nextStatus = computeSignedStatus(existing, signatureRecords)
    ? "signed"
    : "pending_signature";

  await db
    .update(consentDocuments)
    .set({
      status: nextStatus,
      finalizedAt: nextStatus === "signed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(consentDocuments.id, input.consentDocumentId));

  await recordAuditLog({
    actorUserId,
    action: nextStatus === "signed"
      ? "consent.signed"
      : "consent.signature_added",
    entityType: "consent_document",
    entityId: input.consentDocumentId,
    metadata: {
      signerRole: input.signerRole,
      mode: input.mode,
    },
  });

  const updatedRecord = await getDocumentRecordById(input.consentDocumentId);
  if (!updatedRecord) {
    throw new ApiError(500, "Unable to load the signed consent document.");
  }

  return updatedRecord;
}
