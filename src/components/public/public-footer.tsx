import Link from "next/link";

import { APP_TEXT } from "@/constants/appText";
import { publicSiteNavigation } from "@/lib/public-site/navigation";

export function PublicFooter() {
  return (
    <footer className="glass-panel mt-8 rounded-[calc(var(--radius-panel)+6px)] px-8 py-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            {APP_TEXT.PUBLIC.FOOTER_LABEL}
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {APP_TEXT.BRAND_NAME}
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            {APP_TEXT.PUBLIC.FOOTER_DESCRIPTION}
          </p>
          <p className="mt-6 text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} {APP_TEXT.BRAND_NAME}. {APP_TEXT.PUBLIC.FOOTER_COPYRIGHT}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">Platform</p>
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              {publicSiteNavigation.slice(0, 4).map((item) => (
                <Link className="transition hover:text-primary" href={item.href} key={item.label}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">Community</p>
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              {publicSiteNavigation.slice(4).map((item) => (
                <Link className="transition hover:text-primary" href={item.href} key={item.label}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground">Access</p>
            <nav className="flex flex-col gap-3 text-sm font-medium text-muted-foreground">
              <Link className="transition hover:text-primary" href="/login">{APP_TEXT.SHELL.STAFF_ACCESS}</Link>
              <Link className="transition hover:text-primary" href="/dashboard">{APP_TEXT.SHELL.OPEN_BOARD}</Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
