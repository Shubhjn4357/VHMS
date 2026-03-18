import type { Metadata } from "next";
import Link from "next/link";

import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Access Denied",
  description:
    "Access denial page for hospital staff sign-in when a Google identity is not approved or runtime access validation fails.",
  path: "/access-denied",
});

const reasonContent = {
  missing_email: {
    title: "Google did not provide an email for this sign-in.",
    description:
      "The hospital allowlist depends on a real email address. Without it, the app cannot match a staff record or bootstrap admin entry.",
    actions: [
      "Use a Google account that exposes its primary email during sign-in.",
      "Avoid restricted or masked identities that do not return an email claim.",
      "Retry sign-in after confirming the selected account is the intended one.",
    ],
  },
  not_allowlisted: {
    title: "This Google account is not approved for dashboard access.",
    description:
      "Unauthorized identities should never create active staff access. This state is part of the phase 1 auth boundary and remains explicit in both UI and audit logs.",
    actions: [
      "Ask an administrator to add the email to the staff access allowlist.",
      "Confirm role, module permissions, and account status in admin settings.",
      "Retry sign-in only after approval is confirmed.",
    ],
  },
  access_lookup_failed: {
    title: "The app could not validate access during sign-in.",
    description:
      "This is different from a normal allowlist denial. The auth flow hit a temporary lookup failure while checking staff access or syncing the user record.",
    actions: [
      "Retry sign-in once to rule out a transient network or database failure.",
      "Confirm the app is running on http://localhost:3000 and using the latest server restart.",
      "If the issue repeats, inspect the server log for the access lookup error details.",
    ],
  },
} as const;

type AccessDeniedPageProps = {
  searchParams?: Promise<{
    reason?: string;
    email?: string;
    error?: string;
  }>;
};

export default async function AccessDeniedPage({
  searchParams,
}: AccessDeniedPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const reasonKey = params?.reason;
  const content = reasonKey &&
      Object.prototype.hasOwnProperty.call(reasonContent, reasonKey)
    ? reasonContent[reasonKey as keyof typeof reasonContent]
    : reasonContent.not_allowlisted;
  const attemptedEmail = params?.email;
  const authError = params?.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-10 sm:px-6">
      <section className="w-full max-w-2xl rounded-2xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-danger">
          Access denied
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
          {content.title}
        </h1>
        <p className="mt-5 text-base leading-8 text-muted-foreground">
          {content.description}
        </p>

        {attemptedEmail
          ? (
            <div className="management-selection-pill mt-6 inline-flex max-w-full items-center justify-center px-4 py-2 text-sm text-foreground">
              Attempted account: {attemptedEmail}
            </div>
          )
          : null}

        {authError
          ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Auth error code: <span className="font-semibold text-foreground">{authError}</span>
            </p>
          )
          : null}

        <div className="management-subtle-card mt-8 p-5 text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Next valid actions
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
            {content.actions.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-button)] transition hover:bg-primary/90"
          >
            Return to login
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Open public site
          </Link>
        </div>
      </section>
    </div>
  );
}
