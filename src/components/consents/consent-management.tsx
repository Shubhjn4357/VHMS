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
import { startTransition, useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CONSENT_SIGNATURE_MODES } from "@/constants/consentSignatureMode";
import { CONSENT_SIGNER_ROLES } from "@/constants/consentSignerRole";
import { CONSENT_STATUS } from "@/constants/consentStatus";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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
  draft: "bg-[rgba(21,94,239,0.12)] text-accent",
  pending_signature: "bg-[rgba(217,119,6,0.12)] text-warning",
  signed: "bg-[rgba(21,128,61,0.12)] text-success",
  declined: "bg-[rgba(220,38,38,0.12)] text-danger",
  expired: "bg-[rgba(20,32,51,0.08)] text-ink",
  revoked: "bg-[rgba(124,58,237,0.12)] text-[rgb(109,40,217)]",
} as const;

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
    documents.find((document) => document.id === selectedDocumentId) ?? null;
  const selectedPatientId = useWatch({
    control: documentForm.control,
    name: "patientId",
  });
  const filteredAdmissions = selectedPatientId
    ? admissions.filter((admission) =>
      admission.patientId === selectedPatientId
    )
    : admissions;

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
      });
      return;
    }

    createTemplateMutation.mutate(values, {
      onSuccess: (template) => {
        startTransition(() => setSelectedTemplateId(template.id));
      },
    });
  }

  function handleDocumentSubmit(values: DocumentFormValues) {
    createDocumentMutation.mutate(values, {
      onSuccess: (document) => {
        startTransition(() => setSelectedDocumentId(document.id));
      },
    });
  }

  function handleSignatureSubmit(values: SignatureFormValues) {
    if (!selectedDocument) {
      return;
    }

    createSignatureMutation.mutate({
      consentDocumentId: selectedDocument.id,
      ...values,
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
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-ink-soft">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Template library
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {selectedTemplate
                    ? "Edit consent template"
                    : "Create template"}
                </h2>
              </div>

              {selectedTemplate
                ? (
                  <Button
                    onClick={() =>
                      startTransition(() => setSelectedTemplateId(null))}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    New template
                  </Button>
                )
                : null}
            </div>

            {canCreate
              ? (
                <form
                  className="mt-6 space-y-5"
                  onSubmit={templateForm.handleSubmit(handleTemplateSubmit)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Name</span>
                      <Input
                        {...templateForm.register("name")}
                        className="mt-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Slug</span>
                      <Input
                        {...templateForm.register("slug")}
                        className="mt-2"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Category
                    </span>
                    <Input
                      {...templateForm.register("category")}
                      className="mt-2"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Template body
                    </span>
                    <Textarea
                      {...templateForm.register("body")}
                      className="mt-2 min-h-40"
                      placeholder="Use placeholders like {{patientName}}, {{patientHospitalNumber}}, {{procedureName}}, and {{doctorName}}."
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["requiresWitness", "Witness required"],
                      ["requiresDoctor", "Doctor required"],
                      ["active", "Template active"],
                    ].map(([field, label]) => (
                      <label
                        key={field}
                        className="glass-panel-muted flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm text-ink"
                      >
                        <Checkbox
                          {...templateForm.register(
                            field as keyof TemplateFormValues,
                          )}
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <Button
                    disabled={createTemplateMutation.isPending ||
                      updateTemplateMutation.isPending}
                    type="submit"
                  >
                    {createTemplateMutation.isPending ||
                        updateTemplateMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <FilePenLine className="h-4 w-4" />}
                    {selectedTemplate ? "Save template" : "Create template"}
                  </Button>
                </form>
              )
              : (
                <EmptyState
                  className="mt-6 min-h-56"
                  description="Viewing consent records is allowed, but editing the template library and creating new patient documents requires consents.create."
                  icon={FilePenLine}
                  title="Read-only template access"
                />
              )}

            <div className="mt-6 space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="glass-panel-muted rounded-[22px] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {template.name}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {template.category} / {template.slug}
                      </p>
                    </div>
                    <span className="glass-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                      {template.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-soft">
                    {template.body}
                  </p>

                  {canCreate
                    ? (
                      <Button
                        className="mt-4"
                        onClick={() =>
                          startTransition(() =>
                            setSelectedTemplateId(template.id)
                          )}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        <FilePenLine className="h-4 w-4" />
                        Edit template
                      </Button>
                    )
                    : null}
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Document composer
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Render patient-specific consent
              </h2>
            </div>

            {canCreate
              ? (
                <form
                  className="mt-6 space-y-5"
                  onSubmit={documentForm.handleSubmit(handleDocumentSubmit)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Template
                      </span>
                      <ThemedSelect
                        {...documentForm.register("templateId")}
                        className="mt-2"
                      >
                        <option value="">Select template</option>
                        {templates.filter((template) => template.active).map((
                          template,
                        ) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Patient
                      </span>
                      <ThemedSelect
                        {...documentForm.register("patientId")}
                        className="mt-2"
                      >
                        <option value="">Select patient</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.hospitalNumber} - {patient.fullName}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Admission
                      </span>
                      <ThemedSelect
                        {...documentForm.register("admissionId")}
                        className="mt-2"
                      >
                        <option value="">Optional admission link</option>
                        {filteredAdmissions.map((admission) => (
                          <option key={admission.id} value={admission.id}>
                            {admission.patientHospitalNumber} -{" "}
                            {admission.patientName}
                            {admission.bedNumber
                              ? ` / ${admission.bedNumber}`
                              : ""}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Procedure name
                      </span>
                      <Input
                        {...documentForm.register("procedureName")}
                        className="mt-2"
                        placeholder="Optional procedure or treatment label"
                      />
                    </label>
                  </div>

                  <Button
                    disabled={createDocumentMutation.isPending}
                    type="submit"
                  >
                    {createDocumentMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <FileSignature className="h-4 w-4" />}
                    Create consent document
                  </Button>
                </form>
              )
              : null}
          </SurfaceCard>
        </div>

        <SurfaceCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Signature register
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Consent documents and seal state
              </h2>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="glass-panel-muted flex items-center gap-3 rounded-full px-4 py-3 text-sm text-ink-soft">
                <Search className="h-4 w-4 text-brand" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search patient, template, procedure"
                  value={search}
                />
              </label>

              <ThemedSelect
                className="glass-panel-muted rounded-full py-3 font-medium"
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
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
            <div className="space-y-4">
              {documents.length === 0
                ? (
                  <EmptyState
                    description="No consent documents match the current filters. Create a patient-linked document from an active template to begin the signature trail."
                    icon={ShieldCheck}
                    title="No consent documents"
                  />
                )
                : null}

              {documents.map((document) => (
                <article
                  key={document.id}
                  className="glass-panel-muted rounded-[24px] p-4"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-ink">
                          {document.patientName}
                        </h3>
                        <p className="mt-1 text-sm text-ink-soft">
                          {document.templateName}
                          {document.procedureName
                            ? ` / ${document.procedureName}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                          statusToneMap[document.status]
                        }`}
                      >
                        {document.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <p className="text-sm text-ink-soft">
                      {document.patientHospitalNumber}
                    </p>

                    <Button
                      onClick={() =>
                        startTransition(() =>
                          setSelectedDocumentId(document.id)
                        )}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <FileSignature className="h-4 w-4" />
                      Inspect document
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            {!selectedDocument
              ? (
                <EmptyState
                  description="Select a consent document to inspect the rendered text, current signatures, and available next actions."
                  icon={FileSignature}
                  title="No document selected"
                />
              )
              : (
                <div className="space-y-5">
                  <div className="glass-panel-muted rounded-[24px] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-ink">
                          {selectedDocument.templateName}
                        </h3>
                        <span className="glass-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                          {selectedDocument.patientHospitalNumber}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                            statusToneMap[selectedDocument.status]
                          }`}
                        >
                          {selectedDocument.status.replaceAll("_", " ")}
                        </span>
                      </div>

                      <a
                        className={buttonVariants({ size: "sm", variant: "outline" })}
                        href={`/dashboard/print/consents/${selectedDocument.id}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <Printer className="h-4 w-4" />
                        Print document
                      </a>
                    </div>

                    <div className="glass-panel mt-4 rounded-[22px] px-4 py-4 text-sm leading-7 text-ink-soft whitespace-pre-wrap">
                      {selectedDocument.renderedBody}
                    </div>
                  </div>

                  <div className="glass-panel-muted rounded-[24px] p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                      Captured signatures
                    </p>
                    <div className="mt-4 space-y-3">
                      {selectedDocument.signatures.length === 0
                        ? (
                          <p className="text-sm text-ink-soft">
                            No signatures recorded yet.
                          </p>
                        )
                        : selectedDocument.signatures.map((signature) => (
                          <div
                            key={signature.id}
                            className="metric-tile rounded-[20px] px-4 py-3"
                          >
                            <p className="text-sm font-semibold text-ink">
                              {signature.signerRole} - {signature.signerName}
                            </p>
                            <p className="mt-1 text-sm text-ink-soft">
                              {signature.mode.replaceAll("_", " ")}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>

                  {canFinalize
                    ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap gap-3">
                          {selectedDocument.status !== "signed" &&
                              selectedDocument.status !== "revoked"
                            ? (
                              <Button
                                onClick={() =>
                                  updateDocumentStatusMutation.mutate({
                                    id: selectedDocument.id,
                                    action: "REQUEST_SIGNATURE",
                                  })}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Request signature
                              </Button>
                            )
                            : null}

                          {selectedDocument.status !== "declined" &&
                              selectedDocument.status !== "signed"
                            ? (
                              <Button
                                className="hover:border-destructive hover:text-destructive"
                                onClick={() =>
                                  updateDocumentStatusMutation.mutate({
                                    id: selectedDocument.id,
                                    action: "DECLINE",
                                  })}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Mark declined
                              </Button>
                            )
                            : null}

                          {selectedDocument.status === "signed"
                            ? (
                              <Button
                                className="hover:border-destructive hover:text-destructive"
                                onClick={() =>
                                  updateDocumentStatusMutation.mutate({
                                    id: selectedDocument.id,
                                    action: "REVOKE",
                                  })}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Revoke document
                              </Button>
                            )
                            : null}
                        </div>

                        {selectedDocument.status !== "signed" &&
                            selectedDocument.status !== "declined" &&
                            selectedDocument.status !== "revoked"
                          ? (
                            <form
                              className="glass-panel-muted space-y-4 rounded-[24px] p-5"
                              onSubmit={signatureForm.handleSubmit(
                                handleSignatureSubmit,
                              )}
                            >
                              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                                Add signature
                              </p>

                              <div className="grid gap-4 sm:grid-cols-3">
                                <ThemedSelect
                                  {...signatureForm.register("signerRole")}
                                  className="glass-input"
                                >
                                  {CONSENT_SIGNER_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </ThemedSelect>

                                <Input
                                  {...signatureForm.register("signerName")}
                                  className="glass-input"
                                  placeholder="Signer name"
                                />

                                <ThemedSelect
                                  {...signatureForm.register("mode")}
                                  className="glass-input"
                                >
                                  {CONSENT_SIGNATURE_MODES.map((mode) => (
                                    <option key={mode} value={mode}>
                                      {mode.replaceAll("_", " ")}
                                    </option>
                                  ))}
                                </ThemedSelect>
                              </div>

                              <Textarea
                                {...signatureForm.register("notes")}
                                className="min-h-24 glass-input"
                                placeholder="Optional verification or witness note."
                              />

                              <Button
                                disabled={createSignatureMutation.isPending}
                                type="submit"
                              >
                                {createSignatureMutation.isPending
                                  ? <Loader2 className="h-4 w-4 animate-spin" />
                                  : <ShieldCheck className="h-4 w-4" />}
                                Capture signature
                              </Button>
                            </form>
                          )
                          : null}
                      </div>
                    )
                    : null}
                </div>
              )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
