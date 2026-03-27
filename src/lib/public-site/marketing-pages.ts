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
    eyebrow: "Capability map",
    title: "All core hospital workflows run from one operational spine.",
    description:
      "The system is designed for direct single-hospital deployment, so reception, billing, occupancy, communications, consent, discharge, and governance stay connected instead of splitting into separate tools.",
    badge: "Deployment-ready modules",
    metrics: [
      {
        label: "Operational domains",
        value: "12+",
        detail: "Reception, finance, clinical coordination, and governance.",
      },
      {
        label: "Document outputs",
        value: "A4 + thermal",
        detail: "Bills, discharge, and consent documents stay print-safe.",
      },
      {
        label: "Access model",
        value: "Invite-only",
        detail: "Google identity plus explicit staff approval and permissions.",
      },
    ],
    sections: [
      {
        title: "Front desk and patient intake",
        detail:
          "Registration, appointment handling, check-in, queue visibility, and OPD billing stay attached to one patient thread instead of spreading across disconnected screens.",
        points: [
          "Fast patient registration with searchable history and barcode-aware lookup",
          "Appointment queue, check-in state, and doctor-linked throughput management",
          "Draft billing, checkout, and receipt output without losing patient context",
        ],
      },
      {
        title: "Clinical coordination and inpatient control",
        detail:
          "Admissions, rooms, wards, beds, consents, discharge summaries, and patient movement all sit on the same live operational model.",
        points: [
          "Ward, room, and bed masters with live occupancy and movement visibility",
          "Consent documents with signature state and finalized output rules",
          "Discharge summaries with versioning, print routes, and approval-sensitive flow",
        ],
      },
      {
        title: "Governance, communication, and analytics",
        detail:
          "The runtime is built for controlled deployment, not open signup. Staff access, audit logs, communication templates, reports, and analytics support real administrative oversight.",
        points: [
          "Staff access allowlist with role defaults and permission overrides",
          "Reports and analytics for revenue, occupancy, activity, and usage trends",
          "Announcements, communication history, queue logs, and notification tracking",
        ],
      },
    ],
    faqs: [
      {
        question: "Is this just a styled admin shell?",
        answer:
          "No. The runtime already includes real modules for patients, appointments, billing, occupancy, communications, print output, blog publishing, and audit-aware administration.",
      },
      {
        question: "Can the deployment be staged in phases?",
        answer:
          "Yes. Role permissions and feature flags are already structured so hospitals can activate modules gradually instead of going live with everything at once.",
      },
    ],
    ctaTitle: "See the operational deployment map",
    ctaDetail:
      "Review the live runtime, continue into operational fit, or use the public journal to explain the product to stakeholders without exposing internal screens.",
    ctaPrimaryLabel: "Open runtime",
    ctaPrimaryHref: "/dashboard",
    ctaSecondaryLabel: "Review operations",
    ctaSecondaryHref: "/solutions",
  },
  solutions: {
    eyebrow: "Operational fit",
    title: "Designed for hospitals that need speed at the desk and control in the back office.",
    description:
      "The deployment model is single-hospital first, with the runtime organized around front-desk throughput, inpatient allocation, doctor coordination, financial control, and governance visibility.",
    badge: "Single-hospital deployment",
    metrics: [
      {
        label: "OPD + IPD",
        value: "Unified",
        detail: "Outpatient and inpatient operations stay connected.",
      },
      {
        label: "Communication channels",
        value: "3",
        detail: "SMS, email, and WhatsApp template support.",
      },
      {
        label: "Offline posture",
        value: "Critical flows",
        detail: "Draft persistence and sync queue for reception-heavy usage.",
      },
    ],
    sections: [
      {
        title: "Reception throughput",
        detail:
          "The front desk needs to move quickly without becoming unsafe. This runtime keeps the travel distance between registration, queue handling, appointment scheduling, and billing intentionally short.",
        points: [
          "Create patient, schedule appointment, and draft OPD bill from one working surface",
          "Use search, barcode support, and grouped results for rapid lookup",
          "Keep queue, billing, and communication follow-up aligned to the same patient thread",
        ],
      },
      {
        title: "Inpatient coordination",
        detail:
          "IPD operations only work when wards, rooms, beds, admissions, consent, and discharge share the same truth.",
        points: [
          "OPD to IPD handoff through admissions and occupancy workflows",
          "Ward, room, and bed status management with operational visibility",
          "Discharge summaries, consents, and print outputs tied to active admissions",
        ],
      },
      {
        title: "Admin and audit readiness",
        detail:
          "Hospital software needs control surfaces as much as workflow screens. Access, reports, communication trails, analytics, and feature flags make the system deployable in the real world.",
        points: [
          "Invite-only access with role-scoped permissions",
          "Feature flags, audit logs, and analytics modules for governed rollout",
          "Report and export paths for finance and operational review",
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
        question: "Is it meant for one hospital deployment first?",
        answer:
          "Yes. The current architecture is intentionally single-hospital first, with room for branch expansion later if needed.",
      },
    ],
    ctaTitle: "Evaluate the live operating model",
    ctaDetail:
      "Use the dashboard for internal runtime review and the public contact or journal pages for stakeholder-facing review material.",
    ctaPrimaryLabel: "Open live runtime",
    ctaPrimaryHref: "/dashboard",
    ctaSecondaryLabel: "Contact deployment team",
    ctaSecondaryHref: "/contact",
  },
  about: {
    eyebrow: "Why it exists",
    title: "A hospital system designed around real operating pressure, not disconnected admin screens.",
    description:
      "The product direction focuses on reception speed, billing control, occupancy visibility, print-safe documentation, and governance tools that actual hospital teams need before and after deployment.",
    badge: "Deployment philosophy",
    metrics: [
      {
        label: "Architecture",
        value: "Modular monolith",
        detail: "Typed services and domain-driven modules.",
      },
      {
        label: "Stack",
        value: "Next.js + Neon",
        detail: "App Router, Drizzle, Auth.js, TanStack Query, and role-aware modules.",
      },
      {
        label: "Design goal",
        value: "2026 hospital UX",
        detail: "Simple, compact, credible operational surfaces.",
      },
    ],
    sections: [
      {
        title: "Why this product exists",
        detail:
          "Many hospital tools split queueing, billing, occupancy, printing, and administrative control into disconnected systems that staff have to mentally reconcile all day.",
        points: [
          "One patient thread should power appointments, billing, admissions, consents, and discharge",
          "Operations need both fast entry and strong audit boundaries",
          "Internal runtime and public-facing deployment material should belong to one platform",
        ],
      },
      {
        title: "How it is built",
        detail:
          "The app favors modular services, typed boundaries, and role-aware UI instead of a single overloaded admin screen or a marketing-only demo.",
        points: [
          "Invite-only Auth.js access with permission hydration",
          "Typed Drizzle schema on Neon PostgreSQL",
          "Reusable UI primitives and module-based route structure with print-safe separation",
        ],
      },
      {
        title: "What matters in deployment",
        detail:
          "The build is optimized for actual usage rather than brochure polish. It is meant to be sold directly and deployed into a real hospital environment.",
        points: [
          "Bulk actions and exports across core datasets",
          "Offline-aware drafting for reception-heavy workflows",
          "Dedicated print routes for A4 and thermal outputs",
        ],
      },
    ],
    faqs: [
      {
        question: "Is this optimized for one hospital deployment first?",
        answer:
          "Yes. The current runtime is single-hospital first, but the structure leaves room for branch or tenant expansion later.",
      },
      {
        question: "Does design matter as much as operations here?",
        answer:
          "Yes. The goal is a compact, professional operational product that staff can trust under pressure, not a cluttered back-office tool.",
      },
    ],
    ctaTitle: "Continue the deployment review",
    ctaDetail:
      "Move from the product story into the capability map, operational fit, or live runtime depending on who is evaluating the deployment.",
    ctaPrimaryLabel: "Explore capabilities",
    ctaPrimaryHref: "/features",
    ctaSecondaryLabel: "Open journal",
    ctaSecondaryHref: "/blog",
  },
  contact: {
    eyebrow: "Deployment contact",
    title: "Start a hospital deployment conversation with the right operational context.",
    description:
      "Use this page to centralize implementation, branding, support, and stakeholder review details around the live product surface.",
    badge: "Go-live planning",
    metrics: [
      {
        label: "Review path",
        value: "Product-led",
        detail: "Public site, journal, and live dashboard work together.",
      },
      {
        label: "Support mode",
        value: "Implementation-first",
        detail: "Best suited for real rollout conversations.",
      },
      {
        label: "Admin readiness",
        value: "Audit-aware",
        detail: "Governance and access controls are built into the product.",
      },
    ],
    sections: [
      {
        title: "What to bring into the conversation",
        detail:
          "A useful hospital software review is operational, not abstract. The best deployment discussions start with the current workflow and pain points, not a generic feature list.",
        points: [
          "Current patient registration and appointment workflow",
          "Billing, ward, discharge, and communication pain points",
          "Roles that need access on day one versus later phases",
        ],
      },
      {
        title: "Recommended go-live framing",
        detail:
          "The system is strongest when deployment is staged intentionally instead of forcing every module into day one.",
        points: [
          "Phase 1: patients, doctors, appointments, billing",
          "Phase 2: occupancy, consents, discharge, communications",
          "Phase 3: analytics, reports, templates, and advanced admin controls",
        ],
      },
      {
        title: "Operational outputs already available",
        detail:
          "This is not a brochure site for a blank prototype. The runtime already contains working operational modules and production-oriented outputs.",
        points: [
          "Live dashboard modules and protected admin surfaces",
          "Print-safe billing, discharge, and consent routes",
          "Public journal and SEO-aware product pages",
        ],
      },
    ],
    faqs: [
      {
        question: "Can this page show the hospital's real branding?",
        answer:
          "Yes. Contact, address, and legal identity fields are already available through the hospital branding configuration.",
      },
      {
        question: "Can deployment start with a limited staff group?",
        answer:
          "Yes. Invite-only access and role-scoped permissions are designed for controlled activation.",
      },
    ],
    ctaTitle: "Ready for deployment review?",
    ctaDetail:
      "Use the staff access route for the internal runtime and the public pages for stakeholder-facing evaluation without exposing operational data.",
    ctaPrimaryLabel: "Staff access",
    ctaPrimaryHref: "/login",
    ctaSecondaryLabel: "Open runtime",
    ctaSecondaryHref: "/dashboard",
  },
};
