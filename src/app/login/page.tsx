import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { buildPublicMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Staff Login",
  description:
    "Secure invite-only staff login for Vahi HMS Enterprise using approved Google identities, role hydration, and module-level access control.",
  path: "/login",
  keywords: [
    "hospital staff login",
    "invite only admin login",
    "google oauth hospital dashboard",
  ],
});

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[0.96fr_1.04fr]">
        <section className="glass-hero rounded-[36px] p-8 text-white shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/66">
            Invite-only authentication
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Staff access starts before sign-in, not after.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-white/74">
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
                className="rounded-[26px] border border-white/10 bg-white/8 px-4 py-4 text-sm text-white/80 backdrop-blur-md"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-panel-strong rounded-[36px] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand">
            Staff access portal
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
            Continue with approved Google account
          </h2>
          <p className="mt-4 text-base leading-7 text-ink-soft">
            Approved identities are checked against
            the staff access register before the session is allowed into the
            dashboard.
          </p>

          <div className="glass-panel-muted mt-8 rounded-[28px] p-5">
            <p className="text-sm text-ink-soft">Expected access profile</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["Role", "Reception Staff"],
                ["Modules", "Appointments, Billing, Patients"],
                ["Status", "Approved"],
                ["Audit", "Login attempts tracked"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="metric-tile rounded-[22px] px-4 py-4"
                >
                  <p className="text-sm text-ink-soft">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <GoogleSignInButton />

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/"
              className="glass-chip rounded-full px-4 py-3 text-ink transition hover:border-brand hover:text-brand"
            >
              Back to public site
            </Link>
            <Link
              href="/blog"
              className="glass-chip rounded-full px-4 py-3 text-ink-soft transition hover:text-ink"
            >
              CheckOut The Blogs
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
