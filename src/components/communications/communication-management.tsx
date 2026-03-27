"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BellRing,
  FileStack,
  Loader2,
  MailSearch,
  Megaphone,
  RefreshCcw,
  Search,
  Send,
  Siren,
} from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ANNOUNCEMENT_STATUS } from "@/constants/announcementStatus";
import { ANNOUNCEMENT_TARGET_TYPE } from "@/constants/announcementTargetType";
import { COMMUNICATION_CHANNEL } from "@/constants/communicationChannel";
import { COMMUNICATION_STATUS } from "@/constants/communicationStatus";
import { NOTIFICATION_PRIORITY } from "@/constants/notificationPriority";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  useCommunicationWorkspace,
  useCreateAnnouncement,
  useCreateCommunicationTemplate,
  useSendCommunication,
  useUpdateCommunicationTemplate,
  useUpdateNotificationItem,
  useUpdateQueueItem,
} from "@/hooks/useCommunicationsApi";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { usePatientDirectory } from "@/hooks/usePatientsApi";
import {
  createCommunicationTemplateSchema,
  sendCommunicationSchema,
} from "@/lib/validators/communications";

type TemplateFormValues = z.infer<typeof createCommunicationTemplateSchema>;
type TemplateFormInput = z.input<typeof createCommunicationTemplateSchema>;
type SendFormValues = z.infer<typeof sendCommunicationSchema>;
type CommunicationStatusFilter =
  | (typeof COMMUNICATION_STATUS)[number]
  | "ALL";
type AnnouncementDraft = {
  title: string;
  body: string;
  status: (typeof ANNOUNCEMENT_STATUS)[number];
  priority: (typeof NOTIFICATION_PRIORITY)[number];
  pinned: boolean;
  acknowledgementRequired: boolean;
  expiresAt: string;
  targetType: (typeof ANNOUNCEMENT_TARGET_TYPE)[number];
  targetValue: string;
};

const defaultTemplateValues: TemplateFormInput = {
  key: "",
  channel: "SMS",
  title: "",
  body: "",
  active: true,
};

const defaultSendValues: SendFormValues = {
  templateId: "",
  patientId: "",
  destination: "",
};
const defaultAnnouncementDraft: AnnouncementDraft = {
  title: "",
  body: "",
  status: "PUBLISHED",
  priority: "HIGH",
  pinned: false,
  acknowledgementRequired: false,
  expiresAt: "",
  targetType: "ALL",
  targetValue: "",
};

const logToneMap = {
  QUEUED: "border-transparent bg-secondary text-secondary-foreground",
  SENT: "border-transparent bg-primary/10 text-primary",
  DELIVERED: "border-transparent bg-success/15 text-success",
  FAILED: "border-transparent bg-destructive/15 text-destructive",
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

type CommunicationManagementProps = {
  hideHeader?: boolean;
};

export function CommunicationManagement({ hideHeader = false }: CommunicationManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommunicationStatusFilter>("ALL");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState<AnnouncementDraft>(
    defaultAnnouncementDraft,
  );
  const [drawerMode, setDrawerMode] = useState<"TEMPLATE" | "ANNOUNCEMENT" | "SEND" | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const { canAccess: canSend } = useModuleAccess(["communications.send"]);
  const workspaceQuery = useCommunicationWorkspace({
    q: search,
    status: statusFilter,
  });
  const patientQuery = usePatientDirectory();
  const createTemplateMutation = useCreateCommunicationTemplate();
  const updateTemplateMutation = useUpdateCommunicationTemplate();
  const sendMutation = useSendCommunication();
  const updateQueueMutation = useUpdateQueueItem();
  const updateNotificationMutation = useUpdateNotificationItem();
  const createAnnouncementMutation = useCreateAnnouncement();

  const templateForm = useForm<
    TemplateFormInput,
    unknown,
    TemplateFormValues
  >({
    resolver: zodResolver(createCommunicationTemplateSchema),
    defaultValues: defaultTemplateValues,
  });
  const sendForm = useForm<SendFormValues>({
    resolver: zodResolver(sendCommunicationSchema),
    defaultValues: defaultSendValues,
  });

  const templates = workspaceQuery.data?.templates ?? [];
  const logs = workspaceQuery.data?.logs ?? [];
  const notifications = workspaceQuery.data?.notifications ?? [];
  const announcements = workspaceQuery.data?.announcements ?? [];
  const summary = workspaceQuery.data?.summary;
  const patients = patientQuery.data?.entries ?? [];
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
  const previewLog = logs.find((log) => log.id === selectedLogId) ?? null;
  const communicationTemplateFormId = "communication-template-form";
  const communicationAnnouncementFormId = "communication-announcement-form";
  const communicationSendFormId = "communication-send-form";
  const drawerTitle = drawerMode === "TEMPLATE"
    ? selectedTemplate
      ? "Edit communication template"
      : "Create communication template"
    : drawerMode === "ANNOUNCEMENT"
    ? "Publish announcement"
    : "Queue manual communication";
  const drawerDescription = drawerMode === "TEMPLATE"
    ? "Configure reusable message definitions for billing, reminders, and operational follow-up."
    : drawerMode === "ANNOUNCEMENT"
    ? "Publish a hospital-wide alert with audience, priority, and acknowledgement rules."
    : "Send a one-off communication from an approved template without leaving the delivery workspace.";
  const drawerPending = drawerMode === "TEMPLATE"
    ? createTemplateMutation.isPending || updateTemplateMutation.isPending
    : drawerMode === "ANNOUNCEMENT"
    ? createAnnouncementMutation.isPending
    : sendMutation.isPending;

  const clearSelection = () => {
    startTransition(() => {
      setSelectedTemplateId(null);
      setDrawerMode(null);
    });
    templateForm.reset(defaultTemplateValues);
    sendForm.reset(defaultSendValues);
    setAnnouncementDraft(defaultAnnouncementDraft);
  };

  function openDrawer(mode: "TEMPLATE" | "ANNOUNCEMENT" | "SEND") {
    if (mode !== "TEMPLATE") {
      setSelectedTemplateId(null);
    }

    if (mode !== "ANNOUNCEMENT") {
      setAnnouncementDraft(defaultAnnouncementDraft);
    }

    if (mode !== "SEND") {
      sendForm.reset(defaultSendValues);
    }

    setDrawerMode(mode);
    setIsDrawerOpen(true);
  }

  function closePreview() {
    setSelectedLogId(null);
  }

  function updateAnnouncementField<Key extends keyof AnnouncementDraft>(
    field: Key,
    value: AnnouncementDraft[Key],
  ) {
    setAnnouncementDraft((draft) => ({ ...draft, [field]: value }));
  }

  function isAnnouncementStatus(
    value: string,
  ): value is AnnouncementDraft["status"] {
    return (ANNOUNCEMENT_STATUS as readonly string[]).includes(value);
  }

  function isNotificationPriority(
    value: string,
  ): value is AnnouncementDraft["priority"] {
    return (NOTIFICATION_PRIORITY as readonly string[]).includes(value);
  }

  function isAnnouncementTargetType(
    value: string,
  ): value is AnnouncementDraft["targetType"] {
    return (ANNOUNCEMENT_TARGET_TYPE as readonly string[]).includes(value);
  }

  function isCommunicationStatusFilter(
    value: string,
  ): value is CommunicationStatusFilter {
    return value === "ALL" ||
      (COMMUNICATION_STATUS as readonly string[]).includes(value);
  }

  useEffect(() => {
    if (!selectedTemplate) {
      templateForm.reset(defaultTemplateValues);
      return;
    }

    templateForm.reset({
      key: selectedTemplate.key,
      channel: selectedTemplate.channel,
      title: selectedTemplate.title,
      body: selectedTemplate.body,
      active: selectedTemplate.active,
    });
  }, [selectedTemplate, templateForm]);

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

  function handleAnnouncementSubmit() {
    createAnnouncementMutation.mutate({
      title: announcementDraft.title,
      body: announcementDraft.body,
      status: announcementDraft.status,
      priority: announcementDraft.priority,
      pinned: announcementDraft.pinned,
      acknowledgementRequired: announcementDraft.acknowledgementRequired,
      expiresAt: announcementDraft.expiresAt,
      targets: [{
        targetType: announcementDraft.targetType,
        targetValue: announcementDraft.targetValue,
      }],
    }, {
      onSuccess: () => {
        setAnnouncementDraft(defaultAnnouncementDraft);
        setIsDrawerOpen(false);
        clearSelection();
      },
    });
  }

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <PageHeader
          eyebrow="Communication & Notifications"
          title="Central communication engine"
          description="Manage templates, announcements, and outbound communications across all channels with full delivery audit logs."
          actions={
            <Button
              onClick={() => {
                void workspaceQuery.refetch();
                void patientQuery.refetch();
              }}
              size="sm"
              variant="outline"
            >
              {workspaceQuery.isFetching || patientQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          }
        />
      )}

      <section className="grid gap-4 xl:grid-cols-6">
        {[
          ["Templates", summary?.templates ?? 0, "Registered message keys"],
          ["Active", summary?.activeTemplates ?? 0, "Ready for delivery"],
          ["Logs", summary?.logs ?? 0, "All attempts and status"],
          ["Queued", summary?.queued ?? 0, "Awaiting reconciliation"],
          ["Failed", summary?.failed ?? 0, "Delivery errors recorded"],
          ["Unread", summary?.unreadNotifications ?? 0, "Pending in notifications center"],
        ].map(([label, value, detail]) => (
          <SurfaceCard key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
          </SurfaceCard>
        ))}
      </section>

      <FormDrawer
        contentClassName="pb-0"
        description={drawerDescription}
        footer={canSend && drawerMode ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="management-selection-pill px-4 py-3 text-sm leading-6 text-muted-foreground">
              {drawerMode === "TEMPLATE"
                ? "Template changes affect future sends only. Keep keys and channel assignments stable so audit and automation mappings remain readable."
                : drawerMode === "ANNOUNCEMENT"
                ? "Pinned or acknowledgement-required notices are pushed into the in-app notification center immediately after publishing."
                : "Queued messages enter the delivery log right away, so failed sends can be retried from the same workspace."}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              {drawerMode === "TEMPLATE" && selectedTemplate ? (
                <Button
                  onClick={() => setSelectedTemplateId(null)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Stop editing
                </Button>
              ) : null}
              <Button
                onClick={() => {
                  setIsDrawerOpen(false);
                  clearSelection();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Close
              </Button>
              <Button
                disabled={drawerPending}
                form={drawerMode === "TEMPLATE"
                  ? communicationTemplateFormId
                  : drawerMode === "ANNOUNCEMENT"
                  ? communicationAnnouncementFormId
                  : communicationSendFormId}
                type="submit"
              >
                {drawerPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : drawerMode === "TEMPLATE"
                  ? <FileStack className="h-4 w-4" />
                  : drawerMode === "ANNOUNCEMENT"
                  ? <Megaphone className="h-4 w-4" />
                  : <Send className="h-4 w-4" />}
                {drawerMode === "TEMPLATE"
                  ? selectedTemplate
                    ? "Save template"
                    : "Create template"
                  : drawerMode === "ANNOUNCEMENT"
                  ? "Publish announcement"
                  : "Queue communication"}
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
        statusLabel={drawerMode === "TEMPLATE" && selectedTemplate ? selectedTemplate.channel : undefined}
        title={drawerTitle}
      >
        {drawerMode === "TEMPLATE" ? (
          canSend ? (
            <>
              <form
                className="space-y-5"
                id={communicationTemplateFormId}
                onSubmit={templateForm.handleSubmit(handleTemplateSubmit)}
              >
                <FormDrawerSection
                  description="Keep the template key stable so downstream billing, reminder, and follow-up audit trails stay easy to trace."
                  title="Template identity"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Template key</span>
                      <Input {...templateForm.register("key")} className="mt-2" placeholder="billing.receipt.email" />
                      <p className="mt-2 text-sm text-danger">{templateForm.formState.errors.key?.message}</p>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-ink">Channel</span>
                      <ThemedSelect {...templateForm.register("channel")} className="mt-2">
                        {COMMUNICATION_CHANNEL.map((channel) => (
                          <option key={channel} value={channel}>{channel.replaceAll("_", " ")}</option>
                        ))}
                      </ThemedSelect>
                    </label>
                  </div>
                </FormDrawerSection>

                <FormDrawerSection
                  description="Write reusable message content so operators can queue communications during live operations without editing the payload."
                  title="Message content"
                >
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Title</span>
                    <Input {...templateForm.register("title")} className="mt-2" placeholder="Subject line / title" />
                    <p className="mt-2 text-sm text-danger">{templateForm.formState.errors.title?.message}</p>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Body</span>
                    <Textarea {...templateForm.register("body")} className="mt-2 min-h-32" placeholder="Template text content..." />
                    <p className="mt-2 text-sm text-danger">{templateForm.formState.errors.body?.message}</p>
                  </label>

                  <label className="management-subtle-card flex items-center gap-3 px-4 py-3 text-sm text-foreground">
                    <Checkbox {...templateForm.register("active")} />
                    Template is active
                  </label>
                </FormDrawerSection>
              </form>

              <FormDrawerSection
                description="Review and reopen existing templates without leaving the communication workspace."
                title="Current templates"
              >
                <div className="grid gap-4">
                  {templates.length === 0 ? (
                    <EmptyState
                      className="min-h-44"
                      description="No communication templates are available yet."
                      icon={FileStack}
                      title="Template library is empty"
                    />
                  ) : templates.map((template) => (
                    <div key={template.id} className="management-subtle-card p-4 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{template.title}</p>
                          <p className="mt-1 text-muted-foreground">{template.key} / {template.channel.replaceAll("_", " ")}</p>
                        </div>
                        <Badge variant={template.active ? "default" : "secondary"}>
                          {template.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <Button
                        className="mt-4"
                        onClick={() => setSelectedTemplateId(template.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Edit template
                      </Button>
                    </div>
                  ))}
                </div>
              </FormDrawerSection>
            </>
          ) : (
            <EmptyState
              className="min-h-56"
              description="Template management requires communications.send permissions."
              icon={FileStack}
              title="Read-only access"
            />
          )
        ) : null}

        {drawerMode === "ANNOUNCEMENT" ? (
          canSend ? (
            <form
              className="space-y-5"
              id={communicationAnnouncementFormId}
              onSubmit={(event) => {
                event.preventDefault();
                handleAnnouncementSubmit();
              }}
            >
              <FormDrawerSection
                description="Define the core alert content and publication status before notifying staff."
                title="Alert details"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Title</span>
                    <Input className="mt-2" onChange={(e) => updateAnnouncementField("title", e.target.value)} value={announcementDraft.title} />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Status</span>
                    <ThemedSelect
                      className="mt-2"
                      onChange={(e) => {
                        if (isAnnouncementStatus(e.target.value)) {
                          updateAnnouncementField("status", e.target.value);
                        }
                      }}
                      value={announcementDraft.status}
                    >
                      {ANNOUNCEMENT_STATUS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </ThemedSelect>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-ink">Body</span>
                  <Textarea className="mt-2 min-h-28" onChange={(e) => updateAnnouncementField("body", e.target.value)} value={announcementDraft.body} />
                </label>
              </FormDrawerSection>

              <FormDrawerSection
                description="Control who should receive the notice, how prominent it should be, and whether acknowledgement is required."
                title="Audience and priority"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Priority</span>
                    <ThemedSelect
                      className="mt-2"
                      onChange={(e) => {
                        if (isNotificationPriority(e.target.value)) {
                          updateAnnouncementField("priority", e.target.value);
                        }
                      }}
                      value={announcementDraft.priority}
                    >
                      {NOTIFICATION_PRIORITY.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                    </ThemedSelect>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Target</span>
                    <ThemedSelect
                      className="mt-2"
                      onChange={(e) => {
                        if (isAnnouncementTargetType(e.target.value)) {
                          updateAnnouncementField("targetType", e.target.value);
                        }
                      }}
                      value={announcementDraft.targetType}
                    >
                      {ANNOUNCEMENT_TARGET_TYPE.map((targetType) => <option key={targetType} value={targetType}>{targetType}</option>)}
                    </ThemedSelect>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Target value</span>
                    <Input className="mt-2" onChange={(e) => updateAnnouncementField("targetValue", e.target.value)} placeholder="Role or department" value={announcementDraft.targetValue} />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="management-subtle-card flex items-center gap-3 px-4 py-3 text-sm text-foreground">
                    <Checkbox checked={announcementDraft.pinned} onChange={(e) => updateAnnouncementField("pinned", e.target.checked)} />
                    Pinned
                  </label>
                  <label className="management-subtle-card flex items-center gap-3 px-4 py-3 text-sm text-foreground">
                    <Checkbox checked={announcementDraft.acknowledgementRequired} onChange={(e) => updateAnnouncementField("acknowledgementRequired", e.target.checked)} />
                    Ack required
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Expiry (optional)</span>
                    <Input className="mt-2" onChange={(e) => updateAnnouncementField("expiresAt", e.target.value)} type="datetime-local" value={announcementDraft.expiresAt} />
                  </label>
                </div>
              </FormDrawerSection>
            </form>
          ) : (
            <EmptyState
              className="min-h-56"
              description="Publishing announcements requires communications.send permissions."
              icon={Megaphone}
              title="Read-only access"
            />
          )
        ) : null}

        {drawerMode === "SEND" ? (
          canSend ? (
            <form
              className="space-y-5"
              id={communicationSendFormId}
              onSubmit={sendForm.handleSubmit((values) =>
                sendMutation.mutate(values, {
                  onSuccess: () => {
                    setIsDrawerOpen(false);
                    clearSelection();
                  },
                })
              )}
            >
              <FormDrawerSection
                description="Bind the communication to the right template and optionally to a patient so the audit trail stays traceable."
                title="Recipient and template"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Template</span>
                    <ThemedSelect {...sendForm.register("templateId")} className="mt-2">
                      <option value="">Select template</option>
                      {templates.filter((template) => template.active).map((template) => (
                        <option key={template.id} value={template.id}>{template.title} / {template.channel}</option>
                      ))}
                    </ThemedSelect>
                    <p className="mt-2 text-sm text-danger">{sendForm.formState.errors.templateId?.message}</p>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Patient (optional)</span>
                    <ThemedSelect {...sendForm.register("patientId")} className="mt-2">
                      <option value="">Select patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>{patient.hospitalNumber} - {patient.fullName}</option>
                      ))}
                    </ThemedSelect>
                  </label>
                </div>
              </FormDrawerSection>

              <FormDrawerSection
                description="Provide the delivery endpoint exactly as it should be handed to the provider."
                title="Delivery address"
              >
                <label className="block">
                  <span className="text-sm font-medium text-ink">Destination (mobile / email)</span>
                  <Input {...sendForm.register("destination")} className="mt-2" placeholder="Recipient address" />
                  <p className="mt-2 text-sm text-danger">{sendForm.formState.errors.destination?.message}</p>
                </label>
              </FormDrawerSection>
            </form>
          ) : (
            <EmptyState
              className="min-h-56"
              description="Queuing outbound communication requires communications.send permissions."
              icon={Send}
              title="Read-only access"
            />
          )
        ) : null}
      </FormDrawer>

      <RecordPreviewDialog
        actions={previewLog && previewLog.status === "FAILED" && canSend ? (
          <Button
            onClick={() => updateQueueMutation.mutate({ id: previewLog.id, action: "REQUEUE" })}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCcw className="h-4 w-4" />
            Retry delivery
          </Button>
        ) : null}
        description="Inspect the delivery attempt, rendered payload, and queue metadata before retrying or reconciling the communication."
        eyebrow="Communication log"
        onOpenChange={(open) => {
          if (!open) {
            closePreview();
          }
        }}
        open={Boolean(previewLog)}
        status={previewLog ? (
          <Badge className={logToneMap[previewLog.status]} variant="outline">
            {previewLog.status}
          </Badge>
        ) : null}
        title={previewLog?.templateTitle ?? "Manual communication"}
      >
        {previewLog ? (
          <>
            <RecordPreviewSection
              description="Operational routing data for this delivery attempt."
              icon={MailSearch}
              title="Delivery summary"
            >
              <RecordPreviewField label="Channel" value={previewLog.channel.replaceAll("_", " ")} />
              <RecordPreviewField label="Destination" value={previewLog.destination} />
              <RecordPreviewField
                label="Patient"
                value={previewLog.patientName
                  ? `${previewLog.patientHospitalNumber ?? "No UHID"} - ${previewLog.patientName}`
                  : "System generated"}
              />
              <RecordPreviewField label="Created" value={formatDateTime(previewLog.createdAt)} />
            </RecordPreviewSection>

            <RecordPreviewSection
              description="Payload content captured at the time the communication was queued."
              icon={BellRing}
              title="Rendered payload"
            >
              <RecordPreviewField label="Template key" value={previewLog.templateKey ?? "Manual payload"} />
              <RecordPreviewField label="Queue item" value={previewLog.queueId ?? "No queue record"} />
              <RecordPreviewField
                className="md:col-span-2"
                label="Payload title"
                value={previewLog.payloadTitle ?? previewLog.templateTitle ?? "Not captured"}
              />
              <RecordPreviewField
                className="md:col-span-2"
                label="Payload body"
                value={previewLog.payloadBody ?? "No payload body captured"}
              />
            </RecordPreviewSection>

            <RecordPreviewSection
              description="Queue diagnostics used to reconcile retries and provider failures."
              icon={Siren}
              title="Queue diagnostics"
            >
              <RecordPreviewField label="Queue status" value={previewLog.queueStatus ?? "No queue state"} />
              <RecordPreviewField label="Retry count" value={previewLog.retryCount ?? 0} />
              <RecordPreviewField
                className="md:col-span-2"
                label="Last error"
                value={previewLog.lastError ?? "No provider error recorded"}
              />
            </RecordPreviewSection>
          </>
        ) : null}
      </RecordPreviewDialog>

      <section className="grid gap-6">
        <SurfaceCard className="space-y-5">
          <div className="management-toolbar-shell">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operations Queue</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Audit trail and delivery status</h3>
          </div>
          <div className="management-toolbar-actions">
            <label className="management-search-shell">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search logs..."
                  value={search}
                />
            </label>

            <ThemedSelect
              className="min-w-40"
              onChange={(event) => {
                if (isCommunicationStatusFilter(event.target.value)) {
                  setStatusFilter(event.target.value);
                }
              }}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              {COMMUNICATION_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
            </ThemedSelect>
            {canSend && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openDrawer("TEMPLATE")}>
                  <FileStack className="h-4 w-4" />
                  Templates
                </Button>
                <Button variant="outline" onClick={() => openDrawer("ANNOUNCEMENT")}>
                  <Megaphone className="h-4 w-4" />
                  Announce
                </Button>
                <Button onClick={() => openDrawer("SEND")}>
                  <Send className="h-4 w-4" />
                  Queue
                </Button>
              </div>
            )}
          </div>
          </div>
        </SurfaceCard>

        {announcements.length > 0 && (
          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">System Alerts</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="management-record-shell p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{announcement.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {announcement.status} / {announcement.priority} / Created {formatDateTime(announcement.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {announcement.pinned && <Badge variant="secondary">Pinned</Badge>}
                      <Badge variant="outline">
                        {announcement.targets.map(t => t.targetType === "ALL" ? "All" : t.targetValue || t.targetType).join(", ")}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-muted-foreground line-clamp-2">{announcement.body}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        )}

        <SurfaceCard>
          <div className="space-y-4">
            {logs.length === 0 ? (
              <EmptyState description="No communication logs found in history." icon={Send} title="Queue is empty" />
            ) : (
              logs.map((log) => (
                <article key={log.id} className="management-record-shell p-5 text-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-lg font-semibold text-foreground">{log.templateTitle || "Manual message"}</p>
                        <Badge className={logToneMap[log.status]} variant="outline">{log.status}</Badge>
                      </div>
                      <p className="mt-2 text-muted-foreground">{log.channel.replaceAll("_", " ")} / {log.destination}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.patientName || "System generated"} / Created {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => setSelectedLogId(log.id)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        View details
                      </Button>
                      {log.status === "FAILED" && canSend && (
                        <Button
                          onClick={() => updateQueueMutation.mutate({ id: log.id, action: "REQUEUE" })}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Retry delivery
                        </Button>
                      )}
                    </div>
                  </div>
                  {log.lastError && (
                    <div className="mt-3 rounded-lg bg-danger/5 p-3 text-xs text-danger">
                      Error: {log.lastError}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </SurfaceCard>

        {notifications.length > 0 && (
          <SurfaceCard>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">In-app Alerts</p>
            <div className="mt-4 space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="management-subtle-card p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{notification.title}</p>
                        <p className="mt-1 text-muted-foreground">{notification.body}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {notification.priority} / {formatDateTime(notification.createdAt)}
                        </p>
                        {notification.sourceType === "ANNOUNCEMENT" && !notification.acknowledgedAt && (
                          <Button
                            className="mt-3"
                            onClick={() => updateNotificationMutation.mutate({ id: notification.id, action: "ACKNOWLEDGE" })}
                            size="sm"
                            variant="outline"
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                      {!notification.read && (
                        <Button
                          onClick={() => updateNotificationMutation.mutate({ id: notification.id, action: "MARK_READ" })}
                          size="sm"
                          variant="ghost"
                        >
                          Mark read
                        </Button>
                      )}
                    </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        )}
      </section>
    </div>
  );
}
