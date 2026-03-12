"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BellRing,
  FileStack,
  Loader2,
  Megaphone,
  RefreshCcw,
  Search,
  Send,
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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

const logToneMap = {
  QUEUED: "bg-[rgba(21,94,239,0.12)] text-accent",
  SENT: "bg-[rgba(14,116,144,0.12)] text-cyan-700",
  DELIVERED: "bg-[rgba(21,128,61,0.12)] text-success",
  FAILED: "bg-[rgba(220,38,38,0.12)] text-danger",
} as const;

type CommunicationManagementProps = {
  hideHeader?: boolean;
};

export function CommunicationManagement({ hideHeader = false }: CommunicationManagementProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    (typeof COMMUNICATION_STATUS)[number] | "ALL"
  >("ALL");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [announcementDraft, setAnnouncementDraft] = useState({
    title: "",
    body: "",
    status: "PUBLISHED" as (typeof ANNOUNCEMENT_STATUS)[number],
    priority: "HIGH" as (typeof NOTIFICATION_PRIORITY)[number],
    pinned: false,
    acknowledgementRequired: false,
    expiresAt: "",
    targetType: "ALL" as (typeof ANNOUNCEMENT_TARGET_TYPE)[number],
    targetValue: "",
  });

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
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null;

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
      });
      return;
    }

    createTemplateMutation.mutate(values, {
      onSuccess: (template) => {
        startTransition(() => setSelectedTemplateId(template.id));
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
        setAnnouncementDraft({
          title: "",
          body: "",
          status: "PUBLISHED",
          priority: "HIGH",
          pinned: false,
          acknowledgementRequired: false,
          expiresAt: "",
          targetType: "ALL",
          targetValue: "",
        });
      },
    });
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Phase 5 communications"
            title="Communication engine and notification center"
            description="Templates, queued delivery, manual reconciliation, in-app alerts, and announcements are managed from one operations surface so outbound communication stays auditable."
            actions={
              <Button
                onClick={() => {
                  void workspaceQuery.refetch();
                  void patientQuery.refetch();
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {workspaceQuery.isFetching || patientQuery.isFetching
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            }
          />
        )}

      <section className="grid gap-4 xl:grid-cols-6">
        {[
          [
            "Templates",
            summary?.templates ?? 0,
            "Configured message templates",
          ],
          ["Active", summary?.activeTemplates ?? 0, "Available for sending"],
          ["Logs", summary?.logs ?? 0, "Recorded communication attempts"],
          ["Queued", summary?.queued ?? 0, "Awaiting delivery reconciliation"],
          ["Failed", summary?.failed ?? 0, "Need retry or review"],
          [
            "Unread alerts",
            summary?.unreadNotifications ?? 0,
            "Notification center items pending review",
          ],
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

      <section className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Template library
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {selectedTemplate
                    ? "Edit message template"
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

            {canSend
              ? (
                <form
                  className="mt-6 space-y-5"
                  onSubmit={templateForm.handleSubmit(handleTemplateSubmit)}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Template key
                      </span>
                      <Input
                        {...templateForm.register("key")}
                        className="mt-2"
                        placeholder="billing.receipt.email"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Channel
                      </span>
                      <ThemedSelect
                        {...templateForm.register("channel")}
                        className="mt-2"
                      >
                        {COMMUNICATION_CHANNEL.map((channel) => (
                          <option key={channel} value={channel}>
                            {channel.replaceAll("_", " ")}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Title</span>
                    <Input
                      {...templateForm.register("title")}
                      className="mt-2"
                      placeholder="Receipt ready for {{patientName}}"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Body</span>
                    <Textarea
                      {...templateForm.register("body")}
                      className="mt-2 min-h-32"
                      placeholder="Use placeholders like {{patientName}} and {{patientHospitalNumber}}."
                    />
                  </label>

                  <label className="glass-panel-muted flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm text-ink">
                    <Checkbox
                      {...templateForm.register("active")}
                    />
                    Template active
                  </label>

                  <Button
                    disabled={createTemplateMutation.isPending ||
                      updateTemplateMutation.isPending}
                    type="submit"
                  >
                    {createTemplateMutation.isPending ||
                        updateTemplateMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <FileStack className="h-4 w-4" />}
                    {selectedTemplate ? "Save template" : "Create template"}
                  </Button>
                </form>
              )
              : (
                <EmptyState
                  className="mt-6 min-h-56"
                  description="Communication history is visible here, but managing templates and delivery flows requires communications.send."
                  icon={FileStack}
                  title="Read-only communication access"
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
                        {template.title}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {template.key} / {template.channel.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span className="glass-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                      {template.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {canSend
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
                        <FileStack className="h-4 w-4" />
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
                Announcement composer
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                System-wide alerts and pinned notices
              </h2>
            </div>

            {canSend
              ? (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Title
                      </span>
                      <Input
                        className="mt-2"
                        onChange={(event) =>
                          setAnnouncementDraft((draft) => ({
                            ...draft,
                            title: event.target.value,
                          }))}
                        value={announcementDraft.title}
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Status
                      </span>
                      <ThemedSelect
                        className="mt-2"
                        onChange={(event) =>
                          setAnnouncementDraft((draft) => ({
                            ...draft,
                            status: event.target
                              .value as (typeof ANNOUNCEMENT_STATUS)[number],
                          }))}
                        value={announcementDraft.status}
                      >
                        {ANNOUNCEMENT_STATUS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">Body</span>
                    <Textarea
                      className="mt-2 min-h-28"
                      onChange={(event) =>
                        setAnnouncementDraft((draft) => ({
                          ...draft,
                          body: event.target.value,
                        }))}
                      value={announcementDraft.body}
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Priority
                      </span>
                      <ThemedSelect
                        className="mt-2"
                        onChange={(event) =>
                          setAnnouncementDraft((draft) => ({
                            ...draft,
                            priority: event.target
                              .value as (typeof NOTIFICATION_PRIORITY)[number],
                          }))}
                        value={announcementDraft.priority}
                      >
                        {NOTIFICATION_PRIORITY.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Target
                      </span>
                      <ThemedSelect
                        className="mt-2"
                        onChange={(event) =>
                          setAnnouncementDraft((draft) => ({
                            ...draft,
                            targetType: event.target
                              .value as (typeof ANNOUNCEMENT_TARGET_TYPE)[
                                number
                              ],
                          }))}
                        value={announcementDraft.targetType}
                      >
                        {ANNOUNCEMENT_TARGET_TYPE.map((targetType) => (
                          <option key={targetType} value={targetType}>
                            {targetType}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Target value
                      </span>
                      <Input
                        className="mt-2"
                        onChange={(event) =>
                          setAnnouncementDraft((draft) => ({
                            ...draft,
                            targetValue: event.target.value,
                          }))}
                        placeholder="Role or department"
                        value={announcementDraft.targetValue}
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="glass-panel-muted flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm text-ink">
                      <Checkbox
                        checked={announcementDraft.pinned}
                        onChange={(event) =>
                          setAnnouncementDraft((draft) => ({
                            ...draft,
                            pinned: event.target.checked,
                          }))}
                      />
                      Pinned
                    </label>
                    <label className="glass-panel-muted flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm text-ink">
                      <Checkbox
                        checked={announcementDraft.acknowledgementRequired}
                        onChange={(event) =>
                          setAnnouncementDraft((draft) => ({
                            ...draft,
                            acknowledgementRequired: event.target.checked,
                          }))}
                      />
                      Ack required
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Expiry
                      </span>
                      <Input
                        className="mt-2"
                        onChange={(event) =>
                          setAnnouncementDraft((draft) => ({
                            ...draft,
                            expiresAt: event.target.value,
                          }))}
                        type="datetime-local"
                        value={announcementDraft.expiresAt}
                      />
                    </label>
                  </div>

                  <Button
                    disabled={createAnnouncementMutation.isPending}
                    onClick={handleAnnouncementSubmit}
                    type="button"
                  >
                    {createAnnouncementMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Megaphone className="h-4 w-4" />}
                    Publish announcement
                  </Button>
                </div>
              )
              : null}

            <div className="mt-6 space-y-3">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="glass-panel-muted rounded-[22px] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-ink">
                        {announcement.title}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {announcement.status} / {announcement.priority}
                      </p>
                    </div>
                    {announcement.pinned
                      ? (
                        <span className="glass-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                          Pinned
                        </span>
                      )
                      : null}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-ink-soft">
                    {announcement.body}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-soft">
                    {announcement.targets.map((target) =>
                      target.targetType === "ALL"
                        ? "All staff"
                        : `${target.targetType}: ${target.targetValue}`
                    ).join(" / ")}
                  </p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6">
          <SurfaceCard>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Send composer
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                Queue outbound communication
              </h2>
            </div>

            {canSend
              ? (
                <form
                  className="mt-6 space-y-5"
                  onSubmit={sendForm.handleSubmit((values) =>
                    sendMutation.mutate(values)
                  )}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Template
                      </span>
                      <ThemedSelect
                        {...sendForm.register("templateId")}
                        className="mt-2"
                      >
                        <option value="">Select template</option>
                        {templates.filter((template) => template.active).map((
                          template,
                        ) => (
                          <option key={template.id} value={template.id}>
                            {template.title} /{" "}
                            {template.channel.replaceAll("_", " ")}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-ink">
                        Patient
                      </span>
                      <ThemedSelect
                        {...sendForm.register("patientId")}
                        className="mt-2"
                      >
                        <option value="">Optional patient</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.hospitalNumber} - {patient.fullName}
                          </option>
                        ))}
                      </ThemedSelect>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-ink">
                      Destination
                    </span>
                    <Input
                      {...sendForm.register("destination")}
                      className="mt-2"
                      placeholder="Mobile number, email, or delivery label"
                    />
                  </label>

                  <Button
                    disabled={sendMutation.isPending}
                    type="submit"
                  >
                    {sendMutation.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />}
                    Queue communication
                  </Button>
                </form>
              )
              : (
                <EmptyState
                  className="mt-6 min-h-48"
                  description="Communication send, retry, and announcement actions require communications.send."
                  icon={Send}
                  title="Send disabled"
                />
              )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Queue and delivery log
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  Reconcile message outcomes
                </h2>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
              <label className="glass-panel-muted flex items-center gap-3 rounded-full px-4 py-3 text-sm text-ink-soft">
                <Search className="h-4 w-4 text-brand" />
                <Input
                  className="h-auto min-w-44 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search destination, patient, template"
                  value={search}
                />
              </label>

                <ThemedSelect
                  className="glass-panel-muted rounded-full py-3 font-medium"
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as
                        | (typeof COMMUNICATION_STATUS)[number]
                        | "ALL",
                    )}
                  value={statusFilter}
                >
                  <option value="ALL">All statuses</option>
                  {COMMUNICATION_STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </ThemedSelect>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {logs.length === 0
                ? (
                  <EmptyState
                    description="No communication logs match the current filter set. Queue a template-driven message to start the audit trail."
                    icon={Send}
                    title="No communication logs"
                  />
                )
                : null}

              {logs.map((log) => (
                <article
                  key={log.id}
                  className="glass-panel-muted rounded-[24px] p-4"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-ink">
                            {log.templateTitle || "Manual communication"}
                          </p>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                              logToneMap[log.status]
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-ink-soft">
                          {log.channel.replaceAll("_", " ")} / {log.destination}
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">
                          {log.patientName
                            ? `${log.patientName} (${log.patientHospitalNumber})`
                            : "No patient attached"}
                        </p>
                      </div>

                      {log.retryCount !== null
                        ? (
                          <div className="metric-tile rounded-[20px] px-4 py-3 text-sm text-ink">
                            Retries: {log.retryCount}
                          </div>
                        )
                        : null}
                    </div>

                    <div className="glass-panel rounded-[20px] px-4 py-4 text-sm leading-6 text-ink-soft">
                      <p className="font-semibold text-ink">
                        {log.payloadTitle || "No rendered title"}
                      </p>
                      <p className="mt-2">
                        {log.payloadBody || "No rendered body"}
                      </p>
                      {log.lastError
                        ? (
                          <p className="mt-3 text-danger">
                            Last error: {log.lastError}
                          </p>
                        )
                        : null}
                    </div>

                    {canSend && log.queueId
                      ? (
                        <div className="flex flex-wrap gap-3">
                          {log.queueStatus === "QUEUED"
                            ? (
                              <>
                                <Button
                                  onClick={() =>
                                    updateQueueMutation.mutate({
                                      id: log.queueId as string,
                                      action: "MARK_SENT",
                                    })}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Mark sent
                                </Button>
                                <Button
                                  className="hover:border-destructive hover:text-destructive"
                                  onClick={() =>
                                    updateQueueMutation.mutate({
                                      id: log.queueId as string,
                                      action: "MARK_FAILED",
                                      errorMessage:
                                        "Provider returned delivery error.",
                                    })}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Mark failed
                                </Button>
                              </>
                            )
                            : null}

                          {log.queueStatus === "SENT"
                            ? (
                              <>
                                <Button
                                  onClick={() =>
                                    updateQueueMutation.mutate({
                                      id: log.queueId as string,
                                      action: "MARK_DELIVERED",
                                    })}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Mark delivered
                                </Button>
                                <Button
                                  className="hover:border-destructive hover:text-destructive"
                                  onClick={() =>
                                    updateQueueMutation.mutate({
                                      id: log.queueId as string,
                                      action: "MARK_FAILED",
                                      errorMessage: "Delivery callback failed.",
                                    })}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Mark failed
                                </Button>
                              </>
                            )
                            : null}

                          {log.queueStatus === "FAILED"
                            ? (
                              <Button
                                onClick={() =>
                                  updateQueueMutation.mutate({
                                    id: log.queueId as string,
                                    action: "REQUEUE",
                                  })}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                Requeue
                              </Button>
                            )
                            : null}
                        </div>
                      )
                      : null}
                  </div>
                </article>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Notification center
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                In-app alerts and announcement echoes
              </h2>
            </div>

            <div className="mt-6 space-y-3">
              {notifications.length === 0
                ? (
                  <EmptyState
                    className="min-h-48"
                    description="No in-app notifications are available yet."
                    icon={BellRing}
                    title="Notification center is clear"
                  />
                )
                : notifications.map((item) => (
                  <div
                    key={item.id}
                    className="glass-panel-muted rounded-[22px] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-ink">
                          {item.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ink-soft">
                          {item.body}
                        </p>
                      </div>
                      <span className="glass-chip rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                        {item.priority}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      {!item.read
                        ? (
                          <Button
                            onClick={() =>
                              updateNotificationMutation.mutate({
                                id: item.id,
                                action: "MARK_READ",
                              })}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Mark read
                          </Button>
                        )
                        : null}

                      {canSend && !item.acknowledgedAt
                        ? (
                          <Button
                            onClick={() =>
                              updateNotificationMutation.mutate({
                                id: item.id,
                                action: "ACKNOWLEDGE",
                              })}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Acknowledge
                          </Button>
                        )
                        : null}
                    </div>
                  </div>
                ))}
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
