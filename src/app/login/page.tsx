import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Staff Login",
  description:
    "Secure invite-only staff login for Vahi Hospital OS using approved Google identities, role hydration, and module-level access control.",
  path: "/login",
  keywords: [
    "hospital staff login",
    "invite only admin login",
    "google oauth hospital dashboard",
  ],
});

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/20 px-4 py-10 sm:px-6 lg:items-center">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.96fr_1.04fr]">
        <section className="rounded-2xl border bg-sidebar p-8 text-sidebar-foreground shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sidebar-foreground/70">
            Invite-only authentication
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Staff access starts before sign-in, not after.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-sidebar-foreground/80">
            Google OAuth is restricted to approved hospital identities. Access
            is granted only after an admin defines role, module permissions, and
            account status in the staff access register.
          </p>

          <div className="mt-8 grid gap-4">
            {[
              "Approved Google identity check",
              "Role and module permission hydration",
              "Access denied route for unauthorized staff",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-sidebar-border bg-sidebar-accent px-4 py-4 text-sm text-sidebar-accent-foreground"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-8 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Staff access portal
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            Continue with approved Google account
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Approved identities are checked against
            the staff access register before the session is allowed into the
            dashboard.
          </p>

          <div className="management-subtle-card mt-8 p-5">
            <p className="text-sm text-muted-foreground">Expected access profile</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Role", "Reception Staff"],
                ["Modules", "Appointments, Billing, Patients"],
                ["Status", "Approved"],
                ["Audit", "Login attempts tracked"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="management-metric px-4 py-4"
                >
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <GoogleSignInButton />

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-3 text-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              Back to public site
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-md border bg-background px-4 py-3 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            >
              Read the journal
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
