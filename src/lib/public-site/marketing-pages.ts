export type MarketingMetric = {
  label: string;
  value: string;
  detail: string;
};

export type MarketingSection = {
  title: string;
  detail: string;
  points: string[];
};

export type MarketingFaq = {
  question: string;
  answer: string;
};

export type MarketingPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  metrics: MarketingMetric[];
  sections: MarketingSection[];
  faqs: MarketingFaq[];
  ctaTitle: string;
  ctaDetail: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
};

export const marketingPages: Record<string, MarketingPageContent> = {
  features: {
    eyebrow: "Product capabilities",
    title: "Hospital workflows that stay connected from reception to discharge.",
    description:
      "Explore the modules that power patient intake, billing, occupancy, communications, consents, audit controls, and analytics in one operational platform.",
    badge: "Feature map",
    metrics: [
      { label: "Modules", value: "12+", detail: "Operations, clinical, billing, analytics, and governance." },
      { label: "Print routes", value: "4", detail: "A4 and thermal document flows for bills, discharge, and consent." },
      { label: "Access model", value: "Invite-only", detail: "Role-based permissions with allowlisted Google identities." },
    ],
    sections: [
      {
        title: "Reception throughput",
        detail: "Front-desk staff can create patients, schedule appointments, check queue status, and draft invoices without losing the patient thread.",
        points: [
          "Fast patient registration with search, filters, and delete safety checks",
          "Appointment queue with check-in and bulk status actions",
          "Invoice workspace and checkout separation for cleaner runtime handling",
        ],
      },
      {
        title: "Clinical coordination",
        detail: "Doctors, wards, rooms, beds, occupancy, discharge, and consent flows stay linked to real admissions and print-safe outputs.",
        points: [
          "Ward, room, and bed masters with live occupancy linkage",
          "Consent documents with signature workflow and print routes",
          "Discharge summaries with clinical trail and print-safe output",
        ],
      },
      {
        title: "Admin control",
        detail: "Analytics, reports, audit logs, communications, staff access, and feature flags support controlled hospital operations and staged rollouts.",
        points: [
          "Staff access allowlist with permission overrides",
          "Reports and analytics for revenue, occupancy, and usage trends",
          "Communication templates, queue logs, and announcements",
        ],
      },
    ],
    faqs: [
      {
        question: "Is this only a dashboard shell?",
        answer:
          "No. The runtime already includes real data modules, billing flows, occupancy management, communications, and print/export paths.",
      },
      {
        question: "Does it support modular rollout?",
        answer:
          "Yes. Role permissions and feature flags are built to stage access and release modules gradually.",
      },
    ],
    ctaTitle: "See the full workflow map",
    ctaDetail:
      "Open the live dashboard, review the blog, or continue evaluating the platform through solutions and pricing pages.",
    ctaPrimaryLabel: "Open dashboard",
    ctaPrimaryHref: "/dashboard",
    ctaSecondaryLabel: "Read solutions",
    ctaSecondaryHref: "/solutions",
  },
  solutions: {
    eyebrow: "Operational fit",
    title: "Built for hospitals that need billing discipline without slowing reception or ward movement.",
    description:
      "The platform is organized around the realities of front-desk throughput, inpatient allocation, doctor coordination, and audit-ready financial operations.",
    badge: "Solution areas",
    metrics: [
      { label: "OPD + IPD", value: "Unified", detail: "Outpatient and inpatient workflows stay connected." },
      { label: "Communications", value: "3 channels", detail: "SMS, email, and WhatsApp template support." },
      { label: "Offline-ready", value: "Critical flows", detail: "Draft persistence and sync queue for reception-heavy usage." },
    ],
    sections: [
      {
        title: "Front-desk operations",
        detail: "Reception teams need speed, low friction, and safe edits.",
        points: [
          "Create patient, schedule appointment, and draft OPD bill from one runtime",
          "Bulk export and bulk actions for large daily queues",
          "Search and barcode support for fast lookup",
        ],
      },
      {
        title: "Inpatient coordination",
        detail: "IPD operations depend on dependable bed mapping and movement controls.",
        points: [
          "OPD to IPD handoff via occupancy and admission workflow",
          "Ward, room, and bed status management with bulk updates",
          "Discharge, consent, and print routes tied to the active patient thread",
        ],
      },
      {
        title: "Admin and audit readiness",
        detail: "Hospital software needs control surfaces as much as runtime screens.",
        points: [
          "Invite-only access with role-scoped permissions",
          "Feature flags, audit logs, and analytics modules",
          "Report export paths for finance and operational review",
        ],
      },
    ],
    faqs: [
      {
        question: "Can it support different hospital roles?",
        answer:
          "Yes. Role presets and permission groups already cover admin, reception, billing, doctor, nurse, operator, accounts, and auditor usage patterns.",
      },
      {
        question: "Does it fit single-site deployment first?",
        answer:
          "Yes. The current architecture is single-hospital first, with expansion room for branches later.",
      },
    ],
    ctaTitle: "Evaluate the live operations footprint",
    ctaDetail:
      "Use the dashboard for internal runtime review and the blog or pricing page for stakeholder-facing evaluation.",
    ctaPrimaryLabel: "Open live board",
    ctaPrimaryHref: "/dashboard",
    ctaSecondaryLabel: "View pricing",
    ctaSecondaryHref: "/pricing",
  },
  pricing: {
    eyebrow: "Commercial model",
    title: "Transparent platform packaging for operational rollout, not feature confusion.",
    description:
      "This page is structured for stakeholder conversations: what the platform covers, where staged rollout fits, and how implementation can grow by module.",
    badge: "Pricing model",
    metrics: [
      { label: "Deployment model", value: "Single hospital first", detail: "Designed for one live deployment with expansion later." },
      { label: "Rollout style", value: "Phase-based", detail: "Modules can go live progressively with feature gates." },
      { label: "Admin controls", value: "Included", detail: "Audit, reports, analytics, and staff access are part of the core product." },
    ],
    sections: [
      {
        title: "Core operations package",
        detail: "The base package should cover the hospital's live operational backbone.",
        points: [
          "Patients, appointments, doctors, billing, wards, occupancy",
          "Consents, discharge, communications, analytics, reports",
          "Access control, print templates, and audit trails",
        ],
      },
      {
        title: "Rollout options",
        detail: "Hospitals rarely need every module switched on on day one.",
        points: [
          "Start with reception, billing, and patient master flows",
          "Expand into occupancy, discharge, and communications",
          "Use feature flags and role controls for staged activation",
        ],
      },
      {
        title: "Support conversations",
        detail: "Commercial review should stay tied to operational outcomes.",
        points: [
          "Front-desk speed improvement and fewer disconnected tools",
          "Better billing discipline and document output consistency",
          "Clearer audit and reporting posture for admin teams",
        ],
      },
    ],
    faqs: [
      {
        question: "Is there a public self-serve plan?",
        answer:
          "No. This product is positioned as an implementation-led hospital platform, not a generic public SaaS signup flow.",
      },
      {
        question: "Can rollout be staged by department?",
        answer:
          "Yes. Permissions, feature flags, and modular routes support phased operational activation.",
      },
    ],
    ctaTitle: "Need stakeholder-ready review material?",
    ctaDetail:
      "Use this pricing structure alongside the solutions and feature pages to explain rollout, scope, and operational value.",
    ctaPrimaryLabel: "Review features",
    ctaPrimaryHref: "/features",
    ctaSecondaryLabel: "Contact team",
    ctaSecondaryHref: "/contact",
  },
  about: {
    eyebrow: "Product story",
    title: "A hospital system designed around live operations, not disconnected admin screens.",
    description:
      "The product direction focuses on reception speed, billing control, occupancy visibility, print-safe documentation, and governance tools that actual hospital teams need.",
    badge: "About VHMS",
    metrics: [
      { label: "Architecture", value: "Modular monolith", detail: "Typed services and domain-driven modules." },
      { label: "Stack", value: "Next.js + Neon", detail: "App Router, Drizzle, Auth.js, TanStack Query, and role-aware modules." },
      { label: "Design goal", value: "2026 admin UX", detail: "Simple, compact, modular hospital runtime surfaces." },
    ],
    sections: [
      {
        title: "Why this product exists",
        detail: "Many hospital tools split queueing, billing, occupancy, and admin control into disconnected systems.",
        points: [
          "One patient thread should power appointments, billing, admissions, consents, and discharge",
          "Operations need both fast entry and strong audit boundaries",
          "Internal runtime and public-facing product site should belong to one platform",
        ],
      },
      {
        title: "How it is built",
        detail: "The app favors modular services, typed boundaries, and role-aware UI instead of a single overloaded admin screen.",
        points: [
          "Invite-only Auth.js access with permission hydration",
          "Typed Drizzle schema on Neon PostgreSQL",
          "Reusable UI primitives and module-based route structure",
        ],
      },
      {
        title: "What matters operationally",
        detail: "The build is optimized for actual usage rather than marketing-only polish.",
        points: [
          "Bulk actions and exports across core datasets",
          "Offline-aware drafting for reception-heavy workflows",
          "Dedicated print routes for A4 and thermal outputs",
        ],
      },
    ],
    faqs: [
      {
        question: "Is this only for one hospital brand?",
        answer:
          "The current runtime is single-hospital first, but the structure leaves room for branch or tenant expansion later.",
      },
      {
        question: "Does design matter here as much as operations?",
        answer:
          "Yes. The goal is a compact, professional operational product, not a cluttered back-office tool.",
      },
    ],
    ctaTitle: "Continue the product review",
    ctaDetail:
      "Move from the story into the feature map, solutions, or live dashboard review depending on who is evaluating the platform.",
    ctaPrimaryLabel: "Explore features",
    ctaPrimaryHref: "/features",
    ctaSecondaryLabel: "Open blog",
    ctaSecondaryHref: "/blog",
  },
  contact: {
    eyebrow: "Contact and rollout",
    title: "Start a hospital rollout conversation with the right operational context.",
    description:
      "Use this page to centralize implementation, branding, support, and stakeholder discussion details around the live product surface.",
    badge: "Contact VHMS",
    metrics: [
      { label: "Review path", value: "Product-led", detail: "Public site, blog, and live dashboard work together." },
      { label: "Support mode", value: "Implementation-first", detail: "Best suited for real rollout conversations." },
      { label: "Admin readiness", value: "Audit-aware", detail: "Governance and access controls are built into the product." },
    ],
    sections: [
      {
        title: "What to bring into the conversation",
        detail: "A useful hospital software review is operational, not abstract.",
        points: [
          "Current patient registration and appointment workflow",
          "Billing, ward, discharge, and communication pain points",
          "Roles that need access on day one versus later phases",
        ],
      },
      {
        title: "Recommended rollout framing",
        detail: "The system is strong when implementation is staged intentionally.",
        points: [
          "Phase 1: patients, doctors, appointments, billing",
          "Phase 2: occupancy, consents, discharge, communications",
          "Phase 3: analytics, reports, templates, and advanced admin controls",
        ],
      },
      {
        title: "Operational outputs already available",
        detail: "You are not reviewing a blank prototype.",
        points: [
          "Live dashboard modules and protected admin surfaces",
          "Print-safe billing, discharge, and consent routes",
          "Public blog and SEO-aware product pages",
        ],
      },
    ],
    faqs: [
      {
        question: "Can this page show real hospital branding?",
        answer:
          "Yes. Contact, address, and legal identity fields are already available through the hospital branding configuration.",
      },
      {
        question: "Can implementation start with limited staff?",
        answer:
          "Yes. Invite-only access and role-scoped permissions are designed for controlled activation.",
      },
    ],
    ctaTitle: "Ready for implementation review?",
    ctaDetail:
      "Use the staff access route for the internal runtime and the public product pages for stakeholder-facing evaluation.",
    ctaPrimaryLabel: "Staff access",
    ctaPrimaryHref: "/login",
    ctaSecondaryLabel: "Open dashboard",
    ctaSecondaryHref: "/dashboard",
  },
};
