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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/bottom-drawer";
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
  draft: "border-transparent bg-secondary text-secondary-foreground",
  pending_signature: "border-transparent bg-warning/15 text-warning",
  signed: "border-transparent bg-success/15 text-success",
  declined: "border-transparent bg-destructive/15 text-destructive",
  expired: "border-transparent bg-muted text-foreground",
  revoked: "border-transparent bg-accent text-accent-foreground",
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
  const [drawerMode, setDrawerMode] = useState<"TEMPLATE" | "COMPOSE" | "INSPECT" | null>(null);
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
        setSelectedDocumentId(document.id);
        setDrawerMode("INSPECT");
      },
    });
  }

  function clearSelection() {
    setSelectedTemplateId(null);
    setSelectedDocumentId(null);
    templateForm.reset(defaultTemplateValues);
    documentForm.reset(defaultDocumentValues);
    signatureForm.reset(defaultSignatureValues);
    setIsDrawerOpen(false);
    setDrawerMode(null);
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
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <Drawer open={isDrawerOpen} onOpenChange={(open: boolean) => {
        setIsDrawerOpen(open);
        if (!open) clearSelection();
      }}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-4xl overflow-y-auto p-6 pt-0 pb-8 focus:outline-none">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-2xl font-semibold tracking-tight text-foreground">
                {drawerMode === "TEMPLATE" && (selectedTemplate ? "Edit Template" : "New Template")}
                {drawerMode === "COMPOSE" && "New Consent Document"}
                {drawerMode === "INSPECT" && "Document Inspector"}
              </DrawerTitle>
              <DrawerDescription>
                {drawerMode === "TEMPLATE" && "Configure reusable consent text and requirement roles."}
                {drawerMode === "COMPOSE" && "Render a patient-specific consent from an active template."}
                {drawerMode === "INSPECT" && "Review details, print, and capture signatures."}
              </DrawerDescription>
            </DrawerHeader>

            {drawerMode === "TEMPLATE" && (
              <div className="space-y-6">
                {canCreate ? (
                  <form
                    className="mt-2 space-y-5"
                    onSubmit={templateForm.handleSubmit((values) => {
                      handleTemplateSubmit(values);
                      setIsDrawerOpen(false);
                    })}
                  >
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

                    <label className="block">
                      <span className="text-sm font-medium text-ink">Template body</span>
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
                          className="management-subtle-card flex items-center gap-3 px-4 py-3 text-sm text-foreground"
                        >
                          <Checkbox {...templateForm.register(field as keyof TemplateFormValues)} />
                          {label}
                        </label>
                      ))}
                    </div>

                    <Button
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      type="submit"
                    >
                      {createTemplateMutation.isPending || updateTemplateMutation.isPending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <FilePenLine className="h-4 w-4" />}
                      {selectedTemplate ? "Save template" : "Create template"}
                    </Button>
                  </form>
                ) : (
                  <EmptyState
                    className="mt-6 min-h-56"
                    description="Editing the template library requires consents.create."
                    icon={FilePenLine}
                    title="Read-only template access"
                  />
                )}

                <div className="mt-6 space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current Templates</p>
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
                      {canCreate && (
                        <Button
                          className="mt-4"
                          onClick={() => setSelectedTemplateId(template.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <FilePenLine className="h-4 w-4" />
                          Edit template
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {drawerMode === "COMPOSE" && (
              <div className="space-y-6">
                {canCreate ? (
                  <form
                    className="mt-2 space-y-5"
                    onSubmit={documentForm.handleSubmit((values) => {
                      handleDocumentSubmit(values);
                    })}
                  >
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
                            <option key={patient.id} value={patient.id}>
                              {patient.hospitalNumber} - {patient.fullName}
                            </option>
                          ))}
                        </ThemedSelect>
                      </label>
                    </div>

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
                        <Input
                          {...documentForm.register("procedureName")}
                          className="mt-2"
                          placeholder="Optional procedure or treatment label"
                        />
                      </label>
                    </div>

                    <Button disabled={createDocumentMutation.isPending} type="submit">
                      {createDocumentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                      Create consent document
                    </Button>
                  </form>
                ) : null}
              </div>
            )}

            {drawerMode === "INSPECT" && selectedDocument && (
              <div className="mt-2 space-y-6">
                <div className="management-subtle-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-semibold text-foreground">{selectedDocument.templateName}</h3>
                      <Badge variant="outline">
                        {selectedDocument.patientHospitalNumber}
                      </Badge>
                      <Badge className={statusToneMap[selectedDocument.status]} variant="outline">
                        {selectedDocument.status.replaceAll("_", " ")}
                      </Badge>
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

                  <div className="rounded-xl border bg-background px-4 py-4 text-sm leading-7 text-muted-foreground whitespace-pre-wrap">
                    {selectedDocument.renderedBody}
                  </div>
                </div>

                <div className="management-subtle-card p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Captured signatures</p>
                  <div className="mt-4 space-y-3">
                    {selectedDocument.signatures.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No signatures recorded yet.</p>
                    ) : (
                      selectedDocument.signatures.map((signature) => (
                        <div key={signature.id} className="management-metric px-4 py-3">
                          <p className="text-sm font-semibold text-foreground">{signature.signerRole} - {signature.signerName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{signature.mode.replaceAll("_", " ")}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {canFinalize && (
                  <div className="space-y-5">
                    <div className="flex flex-wrap gap-3">
                      {selectedDocument.status !== "signed" && selectedDocument.status !== "revoked" && (
                        <Button
                          onClick={() => updateDocumentStatusMutation.mutate({ id: selectedDocument.id, action: "REQUEST_SIGNATURE" })}
                          size="sm"
                          variant="outline"
                        >
                          Request signature
                        </Button>
                      )}
                      {selectedDocument.status !== "declined" && selectedDocument.status !== "signed" && (
                        <Button
                          className="hover:border-destructive hover:text-destructive"
                          onClick={() => updateDocumentStatusMutation.mutate({ id: selectedDocument.id, action: "DECLINE" })}
                          size="sm"
                          variant="outline"
                        >
                          Mark declined
                        </Button>
                      )}
                      {selectedDocument.status === "signed" && (
                        <Button
                          className="hover:border-destructive hover:text-destructive"
                          onClick={() => updateDocumentStatusMutation.mutate({ id: selectedDocument.id, action: "REVOKE" })}
                          size="sm"
                          variant="outline"
                        >
                          Revoke document
                        </Button>
                      )}
                    </div>

                    {selectedDocument.status !== "signed" && selectedDocument.status !== "declined" && selectedDocument.status !== "revoked" && (
                      <form
                        className="management-subtle-card space-y-4 p-5"
                        onSubmit={signatureForm.handleSubmit(handleSignatureSubmit)}
                      >
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add signature</p>
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
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

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
                <Button variant="outline" onClick={() => { setDrawerMode("TEMPLATE"); setIsDrawerOpen(true); }}>
                  <FilePenLine className="h-4 w-4" />
                  Templates
                </Button>
                <Button onClick={() => { setDrawerMode("COMPOSE"); setIsDrawerOpen(true); }}>
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
                        setSelectedDocumentId(document.id);
                        setDrawerMode("INSPECT");
                        setIsDrawerOpen(true);
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
