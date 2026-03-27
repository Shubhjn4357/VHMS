"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FilePenLine,
  FileSignature,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CONSENT_SIGNATURE_MODES } from "@/constants/consentSignatureMode";
import { CONSENT_SIGNER_ROLES } from "@/constants/consentSignerRole";
import { CONSENT_STATUS } from "@/constants/consentStatus";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDrawer, FormDrawerSection } from "@/components/ui/form-drawer";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  RecordPreviewDialog,
  RecordPreviewField,
  RecordPreviewSection,
} from "@/components/ui/record-preview-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Textarea } from "@/components/ui/textarea";
import { ThemedSelect } from "@/components/ui/themed-select";
import {
  useConsentWorkspace,
  useCreateConsentDocument,
  useCreateConsentSignature,
  useCreateConsentTemplate,
  useUpdateConsentDocumentStatus,
  useUpdateConsentTemplate,
} from "@/hooks/useConsentsApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { usePatientDirectory } from "@/hooks/usePatientsApi";
import {
  createConsentDocumentSchema,
  createConsentSignatureSchema,
  createConsentTemplateSchema,
} from "@/lib/validators/consent";
import type { ConsentDocumentRecord } from "@/types/consent";

type TemplateFormValues = z.infer<typeof createConsentTemplateSchema>;
type TemplateFormInput = z.input<typeof createConsentTemplateSchema>;
type DocumentFormValues = z.infer<typeof createConsentDocumentSchema>;
type DocumentFormInput = z.input<typeof createConsentDocumentSchema>;
type SignatureFormValues = z.infer<typeof createConsentSignatureSchema>;
type SignatureFormInput = z.input<typeof createConsentSignatureSchema>;

const defaultTemplateValues: TemplateFormInput = {
  name: "",
  slug: "",
  category: "",
  body: "",
  requiresWitness: false,
  requiresDoctor: false,
  active: true,
};

const defaultDocumentValues: DocumentFormInput = {
  templateId: "",
  patientId: "",
  admissionId: "",
  procedureName: "",
};

const defaultSignatureValues: SignatureFormInput = {
  signerRole: "PATIENT",
  signerName: "",
  mode: "typed_confirmation",
  notes: "",
};

const statusToneMap = {
  draft: "border-transparent bg-secondary text-secondary-foreground",
  pending_signature: "border-transparent bg-warning/15 text-warning",
  signed: "border-transparent bg-success/15 text-success",
  declined: "border-transparent bg-destructive/15 text-destructive",
  expired: "border-transparent bg-muted text-foreground",
  revoked: "border-transparent bg-accent text-accent-foreground",
} as const;

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

type ConsentManagementProps = {
  hideHeader?: boolean;
};

export function ConsentManagement({ hideHeader = false }: ConsentManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof CONSENT_STATUS)[number] | "ALL"
  >("ALL");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [previewDocumentFallback, setPreviewDocumentFallback] =
    useState<ConsentDocumentRecord | null>(null);
  const [drawerMode, setDrawerMode] = useState<"TEMPLATE" | "COMPOSE" | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { canAccess: canCreate } = useModuleAccess(["consents.create"]);
  const { canAccess: canFinalize } = useModuleAccess(["consents.finalize"]);
  const consentQuery = useConsentWorkspace({
    q: search,
    status: statusFilter,
  });
  const patientQuery = usePatientDirectory();
  const createTemplateMutation = useCreateConsentTemplate();
  const updateTemplateMutation = useUpdateConsentTemplate();
  const createDocumentMutation = useCreateConsentDocument();
  const updateDocumentStatusMutation = useUpdateConsentDocumentStatus();
  const createSignatureMutation = useCreateConsentSignature();

  const templateForm = useForm<
    TemplateFormInput,
    unknown,
    TemplateFormValues
  >({
    resolver: zodResolver(createConsentTemplateSchema),
    defaultValues: defaultTemplateValues,
  });
  const documentForm = useForm<DocumentFormInput, unknown, DocumentFormValues>({
    resolver: zodResolver(createConsentDocumentSchema),
    defaultValues: defaultDocumentValues,
  });
  const signatureForm = useForm<
    SignatureFormInput,
    unknown,
    SignatureFormValues
  >({
    resolver: zodResolver(createConsentSignatureSchema),
    defaultValues: defaultSignatureValues,
  });

  const templates = consentQuery.data?.templates ?? [];
  const documents = consentQuery.data?.documents ?? [];
  const admissions = consentQuery.data?.admissions ?? [];
  const summary = consentQuery.data?.summary;
  const patients = patientQuery.data?.entries ?? [];
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ??
    previewDocumentFallback;
  const selectedPatientId = useWatch({
    control: documentForm.control,
    name: "patientId",
  });
  const filteredAdmissions = selectedPatientId
    ? admissions.filter((admission) =>
      admission.patientId === selectedPatientId
    )
    : admissions;
  const consentTemplateFormId = "consent-template-form";
  const consentDocumentFormId = "consent-document-form";
  const drawerSubmitPending = drawerMode === "TEMPLATE"
    ? createTemplateMutation.isPending || updateTemplateMutation.isPending
    : createDocumentMutation.isPending;
  const drawerSubmitLabel = drawerMode === "TEMPLATE"
    ? selectedTemplate ? "Save template" : "Create template"
    : "Create consent document";

  useEffect(() => {
    if (!selectedTemplate) {
      templateForm.reset(defaultTemplateValues);
      return;
    }

    templateForm.reset({
      name: selectedTemplate.name,
      slug: selectedTemplate.slug,
      category: selectedTemplate.category,
      body: selectedTemplate.body,
      requiresWitness: selectedTemplate.requiresWitness,
      requiresDoctor: selectedTemplate.requiresDoctor,
      active: selectedTemplate.active,
    });
  }, [selectedTemplate, templateForm]);

  useEffect(() => {
    if (!selectedDocument) {
      signatureForm.reset(defaultSignatureValues);
      return;
    }

    const presentRoles = new Set(
      selectedDocument.signatures.map((signature) => signature.signerRole),
    );
    const nextRole = CONSENT_SIGNER_ROLES.find((role) =>
      !presentRoles.has(role)
    ) ??
      "PATIENT";

    signatureForm.reset({
      ...defaultSignatureValues,
      signerRole: nextRole,
      signerName: selectedDocument.patientName,
    });
  }, [selectedDocument, signatureForm]);

  function handleTemplateSubmit(values: TemplateFormValues) {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({
        id: selectedTemplate.id,
        ...values,
      }, {
        onSuccess: () => {
          setIsDrawerOpen(false);
          clearSelection();
        },
      });
      return;
    }

    createTemplateMutation.mutate(values, {
      onSuccess: () => {
        setIsDrawerOpen(false);
        clearSelection();
      },
    });
  }

  function handleDocumentSubmit(values: DocumentFormValues) {
    createDocumentMutation.mutate(values, {
      onSuccess: (document) => {
        setPreviewDocumentFallback(document);
        setSelectedDocumentId(document.id);
        setIsDrawerOpen(false);
        setDrawerMode(null);
        documentForm.reset(defaultDocumentValues);
      },
    });
  }

  function clearSelection() {
    setSelectedTemplateId(null);
    templateForm.reset(defaultTemplateValues);
    documentForm.reset(defaultDocumentValues);
    setIsDrawerOpen(false);
    setDrawerMode(null);
  }

  function closePreview() {
    setSelectedDocumentId(null);
    setPreviewDocumentFallback(null);
    signatureForm.reset(defaultSignatureValues);
  }

  function handleSignatureSubmit(values: SignatureFormValues) {
    if (!selectedDocument) {
      return;
    }

    createSignatureMutation.mutate({
      consentDocumentId: selectedDocument.id,
      ...values,
    }, {
      onSuccess: (document) => {
        setPreviewDocumentFallback(document);
        setSelectedDocumentId(document.id);
      },
    });
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 4 consent and e-sign"
            title="Consent templates and signature workflow"
            description="Manage reusable consent templates, render patient-specific documents, and seal them through role-specific signatures with immutable signed state."
            actions={
              <Button
                onClick={() => {
                  void consentQuery.refetch();
                  void patientQuery.refetch();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {consentQuery.isFetching || patientQuery.isFetching
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            }
          />
        )}

      <section className="grid gap-4 xl:grid-cols-6">
        {[
          ["Templates", summary?.templates ?? 0, "Reusable consent library"],
          ["Active", summary?.activeTemplates ?? 0, "Usable for rendering"],
          ["Documents", summary?.documents ?? 0, "Patient-linked consents"],
          ["Draft", summary?.draftDocuments ?? 0, "Not yet sent to signing"],
          [
            "Pending sign",
            summary?.pendingSignatureDocuments ?? 0,
            "Awaiting missing signatures",
          ],
          ["Signed", summary?.signedDocuments ?? 0, "Fully sealed records"],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <FormDrawer
        contentClassName="pb-0"
        description={drawerMode === "TEMPLATE"
          ? "Configure reusable consent text, required signers, and library status."
          : "Render a patient-specific consent from the approved template library."}
        footer={canCreate && drawerMode ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="management-selection-pill px-4 py-3 text-sm leading-6 text-muted-foreground">
              {drawerMode === "TEMPLATE"
                ? "Use placeholders so the same template can safely render for multiple patients and procedures."
                : "Compose from an active template so the signed record inherits the correct legal text."}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <Button onClick={clearSelection} size="sm" type="button" variant="outline">
                Close
              </Button>
              <Button
                disabled={drawerSubmitPending}
                form={drawerMode === "TEMPLATE" ? consentTemplateFormId : consentDocumentFormId}
                type="submit"
              >
                {drawerSubmitPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {!drawerSubmitPending && drawerMode === "TEMPLATE" ? <FilePenLine className="h-4 w-4" /> : null}
                {!drawerSubmitPending && drawerMode !== "TEMPLATE" ? <FileSignature className="h-4 w-4" /> : null}
                {drawerSubmitLabel}
              </Button>
            </div>
          </div>
        ) : null}
        mode={drawerMode === "TEMPLATE" && selectedTemplate ? "edit" : "create"}
        onOpenChange={(open) => {
          setIsDrawerOpen(open);
          if (!open) {
            clearSelection();
          }
        }}
        open={isDrawerOpen}
        statusLabel={drawerMode === "TEMPLATE" && selectedTemplate ? selectedTemplate.category : undefined}
        title={drawerMode === "TEMPLATE"
          ? selectedTemplate ? "Edit consent template" : "Create consent template"
          : "Create consent document"}
      >
        {drawerMode === "TEMPLATE" ? (
          canCreate ? (
            <>
              <form className="space-y-5" id={consentTemplateFormId} onSubmit={templateForm.handleSubmit(handleTemplateSubmit)}>
                <FormDrawerSection title="Template identity">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Name</span>
                      <Input {...templateForm.register("name")} className="mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Slug</span>
                      <Input {...templateForm.register("slug")} className="mt-2" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Category</span>
                    <Input {...templateForm.register("category")} className="mt-2" />
                  </label>
                </FormDrawerSection>
                <FormDrawerSection title="Consent body">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Template body</span>
                    <Textarea {...templateForm.register("body")} className="mt-2 min-h-40" placeholder="Use placeholders like {{patientName}}, {{patientHospitalNumber}}, {{procedureName}}, and {{doctorName}}." />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["requiresWitness", "Witness required"],
                      ["requiresDoctor", "Doctor required"],
                      ["active", "Template active"],
                    ].map(([field, label]) => (
                      <label key={field} className="management-subtle-card flex items-center gap-3 px-4 py-3 text-sm text-foreground">
                        <Checkbox {...templateForm.register(field as keyof TemplateFormValues)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </FormDrawerSection>
              </form>
              <FormDrawerSection title="Current templates">
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <div key={template.id} className="management-subtle-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{template.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{template.category} / {template.slug}</p>
                        </div>
                        <Badge variant={template.active ? "default" : "secondary"}>
                          {template.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <Button className="mt-4" onClick={() => setSelectedTemplateId(template.id)} size="sm" type="button" variant="outline">
                        <FilePenLine className="h-4 w-4" />
                        Edit template
                      </Button>
                    </div>
                  ))}
                </div>
              </FormDrawerSection>
            </>
          ) : (
            <EmptyState className="min-h-56" description="Editing the template library requires consents.create." icon={FilePenLine} title="Read-only template access" />
          )
        ) : null}

        {drawerMode === "COMPOSE" ? (
          canCreate ? (
            <form className="space-y-5" id={consentDocumentFormId} onSubmit={documentForm.handleSubmit(handleDocumentSubmit)}>
              <FormDrawerSection title="Template and patient">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Template</span>
                    <ThemedSelect {...documentForm.register("templateId")} className="mt-2">
                      <option value="">Select template</option>
                      {templates.filter((template) => template.active).map((template) => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </ThemedSelect>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Patient</span>
                    <ThemedSelect {...documentForm.register("patientId")} className="mt-2">
                      <option value="">Select patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>{patient.hospitalNumber} - {patient.fullName}</option>
                      ))}
                    </ThemedSelect>
                  </label>
                </div>
              </FormDrawerSection>
              <FormDrawerSection title="Clinical context">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Admission</span>
                    <ThemedSelect {...documentForm.register("admissionId")} className="mt-2">
                      <option value="">Optional admission link</option>
                      {filteredAdmissions.map((admission) => (
                        <option key={admission.id} value={admission.id}>
                          {admission.patientHospitalNumber} - {admission.patientName}
                          {admission.bedNumber ? ` / ${admission.bedNumber}` : ""}
                        </option>
                      ))}
                    </ThemedSelect>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Procedure name</span>
                    <Input {...documentForm.register("procedureName")} className="mt-2" placeholder="Optional procedure or treatment label" />
                  </label>
                </div>
              </FormDrawerSection>
            </form>
          ) : (
            <EmptyState className="min-h-56" description="Creating consent documents requires consents.create." icon={FileSignature} title="Read-only document access" />
          )
        ) : null}
      </FormDrawer>

      <RecordPreviewDialog
        actions={selectedDocument ? (
          <>
            <a
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={`/dashboard/print/consents/${selectedDocument.id}`}
              rel="noreferrer"
              target="_blank"
            >
              <Printer className="h-4 w-4" />
              Print document
            </a>
            {canFinalize && selectedDocument.status !== "signed" && selectedDocument.status !== "revoked" ? (
              <Button
                onClick={() => updateDocumentStatusMutation.mutate(
                  { id: selectedDocument.id, action: "REQUEST_SIGNATURE" },
                  { onSuccess: (document) => setPreviewDocumentFallback(document) },
                )}
                size="sm"
                type="button"
                variant="outline"
              >
                Request signature
              </Button>
            ) : null}
            {canFinalize && selectedDocument.status !== "declined" && selectedDocument.status !== "signed" ? (
              <Button
                className="hover:border-destructive hover:text-destructive"
                onClick={() => updateDocumentStatusMutation.mutate(
                  { id: selectedDocument.id, action: "DECLINE" },
                  { onSuccess: (document) => setPreviewDocumentFallback(document) },
                )}
                size="sm"
                type="button"
                variant="outline"
              >
                Mark declined
              </Button>
            ) : null}
            {canFinalize && selectedDocument.status === "signed" ? (
              <Button
                className="hover:border-destructive hover:text-destructive"
                onClick={() => updateDocumentStatusMutation.mutate(
                  { id: selectedDocument.id, action: "REVOKE" },
                  { onSuccess: (document) => setPreviewDocumentFallback(document) },
                )}
                size="sm"
                type="button"
                variant="outline"
              >
                Revoke document
              </Button>
            ) : null}
          </>
        ) : null}
        description="Review the rendered consent, document status, and captured signatures before printing or collecting the next signer."
        eyebrow="Consent document"
        onOpenChange={(open) => {
          if (!open) {
            closePreview();
          }
        }}
        open={Boolean(selectedDocument)}
        status={selectedDocument ? (
          <Badge className={statusToneMap[selectedDocument.status]} variant="outline">
            {selectedDocument.status.replaceAll("_", " ")}
          </Badge>
        ) : null}
        title={selectedDocument?.templateName ?? "Consent document"}
      >
        {selectedDocument ? (
          <>
            <RecordPreviewSection
              description="Core patient and legal context for this rendered consent record."
              icon={ShieldCheck}
              title="Document overview"
            >
              <RecordPreviewField label="Patient" value={selectedDocument.patientName} />
              <RecordPreviewField label="UHID" value={selectedDocument.patientHospitalNumber} />
              <RecordPreviewField label="Procedure" value={selectedDocument.procedureName || "Not specified"} />
              <RecordPreviewField label="Created" value={formatDateTime(selectedDocument.createdAt)} />
              <RecordPreviewField label="Finalized" value={formatDateTime(selectedDocument.finalizedAt)} />
              <RecordPreviewField label="Admission link" value={selectedDocument.admissionId || "Not linked"} />
            </RecordPreviewSection>

            <RecordPreviewSection
              description="Rendered legal body after patient, admission, and procedure placeholders were applied."
              icon={FileSignature}
              title="Rendered consent"
            >
              <RecordPreviewField
                className="md:col-span-2"
                label="Consent body"
                value={<div className="whitespace-pre-wrap">{selectedDocument.renderedBody}</div>}
              />
            </RecordPreviewSection>

            <RecordPreviewSection
              description="Signature audit entries already captured for this document."
              icon={Printer}
              title="Captured signatures"
            >
              {selectedDocument.signatures.length === 0 ? (
                <RecordPreviewField className="md:col-span-2" label="Signatures" value="No signatures recorded yet." />
              ) : (
                selectedDocument.signatures.map((signature) => (
                  <RecordPreviewField
                    key={signature.id}
                    label={signature.signerRole}
                    value={`${signature.signerName} / ${signature.mode.replaceAll("_", " ")} / ${formatDateTime(signature.signedAt)}`}
                  />
                ))
              )}
            </RecordPreviewSection>

            {canFinalize && selectedDocument.status !== "signed" && selectedDocument.status !== "declined" && selectedDocument.status !== "revoked" ? (
              <section className="management-record-shell p-5">
                <div className="border-b border-border/70 pb-4">
                  <h4 className="text-lg font-semibold text-foreground">Add signature</h4>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Capture the next signature without leaving the document preview.
                  </p>
                </div>
                <form className="mt-5 space-y-4" onSubmit={signatureForm.handleSubmit(handleSignatureSubmit)}>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <ThemedSelect {...signatureForm.register("signerRole")}>
                      {CONSENT_SIGNER_ROLES.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </ThemedSelect>
                    <Input {...signatureForm.register("signerName")} placeholder="Signer name" />
                    <ThemedSelect {...signatureForm.register("mode")}>
                      {CONSENT_SIGNATURE_MODES.map((mode) => (
                        <option key={mode} value={mode}>{mode.replaceAll("_", " ")}</option>
                      ))}
                    </ThemedSelect>
                  </div>
                  <Textarea {...signatureForm.register("notes")} className="min-h-20" placeholder="Optional signature notes" />
                  <Button disabled={createSignatureMutation.isPending} type="submit">
                    {createSignatureMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                    Sign document
                  </Button>
                </form>
              </section>
            ) : null}
          </>
        ) : null}
      </RecordPreviewDialog>

      <section className="grid gap-6">
        <SurfaceCard className="space-y-5">
          <div className="management-toolbar-shell">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Consent Register</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Signed and pending documents
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage patient consent trails, templates and signature verification.
            </p>
          </div>
          <div className="management-toolbar-actions">
              <label className="management-search-shell">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patient, template, procedure"
                  value={search}
                />
              </label>

              <ThemedSelect
                className="min-w-40"
                onChange={(event) => setStatusFilter(
                  event.target.value as (typeof CONSENT_STATUS)[number] | "ALL",
                )}
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                {CONSENT_STATUS.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </ThemedSelect>
            </div>
            {canCreate && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedTemplateId(null);
                    setDrawerMode("TEMPLATE");
                    setIsDrawerOpen(true);
                  }}
                >
                  <FilePenLine className="h-4 w-4" />
                  Templates
                </Button>
                <Button
                  onClick={() => {
                    documentForm.reset(defaultDocumentValues);
                    setDrawerMode("COMPOSE");
                    setIsDrawerOpen(true);
                  }}
                >
                  <FileSignature className="h-4 w-4" />
                  New Consent
                </Button>
              </>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="space-y-4">
            {documents.length === 0 ? (
              <EmptyState
                description="No consent documents match the set filters."
                icon={ShieldCheck}
                title="No consent documents"
              />
            ) : (
              documents.map((document) => (
                <article
                  key={document.id}
                  className="management-record-shell p-5 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">{document.patientName}</h3>
                        <Badge variant="outline">
                          {document.patientHospitalNumber}
                        </Badge>
                        <Badge
                          className={statusToneMap[document.status]}
                          variant="outline"
                        >
                          {document.status.replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {document.templateName}
                        {document.procedureName ? ` / ${document.procedureName}` : ""}
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setPreviewDocumentFallback(document);
                        setSelectedDocumentId(document.id);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <FileSignature className="h-4 w-4" />
                      View & Sign
                    </Button>
                  </div>
                </article>
              ))
            )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
