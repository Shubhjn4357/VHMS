import "server-only";

import { env } from "@/env";
import type { CommunicationChannel } from "@/constants/communicationChannel";

type DispatchInput = {
  channel: CommunicationChannel;
  destination: string;
  title: string;
  body: string;
};

export type ProviderDispatchResult = {
  status: "QUEUED" | "SENT" | "DELIVERED" | "FAILED";
  provider: string | null;
  externalId: string | null;
  errorMessage: string | null;
};

function asHtml(body: string) {
  return body
    .split(/\n\s*\n/g)
    .map((paragraph) => `<p>${paragraph.trim()}</p>`)
    .join("");
}

async function dispatchEmailViaResend(
  input: DispatchInput,
): Promise<ProviderDispatchResult> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return {
      status: "QUEUED",
      provider: "RESEND",
      externalId: null,
      errorMessage: null,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [input.destination],
      subject: input.title,
      html: asHtml(input.body),
      text: input.body,
    }),
  });

  const payload = await response.json().catch(() => null) as
    | { id?: string; message?: string }
    | null;

  if (!response.ok) {
    return {
      status: "FAILED",
      provider: "RESEND",
      externalId: null,
      errorMessage: payload?.message ?? "Resend rejected the email request.",
    };
  }

  return {
    status: "SENT",
    provider: "RESEND",
    externalId: payload?.id ?? null,
    errorMessage: null,
  };
}

function buildTwilioAuthHeader() {
  return `Basic ${
    Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString(
      "base64",
    )
  }`;
}

function normalizeWhatsAppDestination(value: string) {
  return value.startsWith("whatsapp:") ? value : `whatsapp:${value}`;
}

async function dispatchViaTwilio(
  input: DispatchInput,
  mode: "SMS" | "WHATSAPP",
): Promise<ProviderDispatchResult> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return {
      status: "QUEUED",
      provider: "TWILIO",
      externalId: null,
      errorMessage: null,
    };
  }

  const fromValue = mode === "SMS" ? env.TWILIO_SMS_FROM : env.TWILIO_WHATSAPP_FROM;
  if (!fromValue) {
    return {
      status: "QUEUED",
      provider: "TWILIO",
      externalId: null,
      errorMessage: null,
    };
  }

  const body = new URLSearchParams({
    To: mode === "SMS" ? input.destination : normalizeWhatsAppDestination(input.destination),
    From: mode === "SMS" ? fromValue : normalizeWhatsAppDestination(fromValue),
    Body: `${input.title}\n\n${input.body}`,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: buildTwilioAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  const payload = await response.json().catch(() => null) as
    | { sid?: string; message?: string }
    | null;

  if (!response.ok) {
    return {
      status: "FAILED",
      provider: "TWILIO",
      externalId: null,
      errorMessage: payload?.message ?? "Twilio rejected the outbound message.",
    };
  }

  return {
    status: "SENT",
    provider: "TWILIO",
    externalId: payload?.sid ?? null,
    errorMessage: null,
  };
}

export async function dispatchCommunicationViaProvider(
  input: DispatchInput,
): Promise<ProviderDispatchResult> {
  if (input.channel === "IN_APP_NOTIFICATION" ||
    input.channel === "SYSTEM_ANNOUNCEMENT" ||
    input.channel === "INTERNAL_ACTIVITY_FEED") {
    return {
      status: "DELIVERED",
      provider: "INTERNAL",
      externalId: null,
      errorMessage: null,
    };
  }

  if (input.channel === "EMAIL") {
    if (env.COMMUNICATION_EMAIL_PROVIDER !== "RESEND") {
      return {
        status: "QUEUED",
        provider: null,
        externalId: null,
        errorMessage: null,
      };
    }

    return dispatchEmailViaResend(input);
  }

  if (input.channel === "SMS") {
    if (env.COMMUNICATION_SMS_PROVIDER !== "TWILIO") {
      return {
        status: "QUEUED",
        provider: null,
        externalId: null,
        errorMessage: null,
      };
    }

    return dispatchViaTwilio(input, "SMS");
  }

  if (input.channel === "WHATSAPP") {
    if (env.COMMUNICATION_WHATSAPP_PROVIDER !== "TWILIO") {
      return {
        status: "QUEUED",
        provider: null,
        externalId: null,
        errorMessage: null,
      };
    }

    return dispatchViaTwilio(input, "WHATSAPP");
  }

  return {
    status: "QUEUED",
    provider: null,
    externalId: null,
    errorMessage: null,
  };
}
