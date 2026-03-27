import { describe, expect, it } from "vitest";

import { buildCommunicationWorkflowInsights } from "@/lib/communications/insights";

describe("communication workflow insights", () => {
  it("groups reminder, discharge, and staff-notification signals", () => {
    const insights = buildCommunicationWorkflowInsights({
      messages: [
        {
          channel: "SMS",
          status: "FAILED",
          templateKey: "appointment.reminder.sms",
          templateTitle: "Appointment reminder",
        },
        {
          channel: "WHATSAPP",
          status: "QUEUED",
          payloadTitle: "Discharge instructions for Ritika Sharma",
        },
        {
          channel: "IN_APP_NOTIFICATION",
          status: "SENT",
          templateKey: "ops.alert.inapp",
          payloadTitle: "Operational alert for Leena Patel",
        },
      ],
      notifications: [
        {
          title: "Failed SMS requires retry",
          body: "Reminder SMS needs destination verification.",
          read: false,
          sourceType: "message_queue",
          targetRole: "BILLING_STAFF",
        },
      ],
    });

    expect(insights).toEqual([
      expect.objectContaining({
        workflow: "appointment_reminders",
        messageCount: 1,
        failed: 1,
      }),
      expect.objectContaining({
        workflow: "discharge_instructions",
        messageCount: 1,
        queued: 1,
      }),
      expect.objectContaining({
        workflow: "staff_notifications",
        messageCount: 1,
        delivered: 1,
        notificationCount: 1,
        unreadNotifications: 1,
      }),
    ]);
  });
});
