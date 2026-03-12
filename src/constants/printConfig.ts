export const PRINT_TEMPLATE_DEFINITIONS = {
  a4Bill: {
    key: "a4Bill",
    label: "A4 bill invoice",
    description:
      "Full-page invoice for billing, filing, and account reconciliation.",
    paperLabel: "A4 portrait",
    sections: [
      {
        key: "branding",
        label: "Hospital branding",
        description: "Hospital name, address, contact details, and header.",
        defaultOrder: 0,
      },
      {
        key: "metadata",
        label: "Invoice metadata",
        description: "Invoice number, generated timestamp, and registration.",
        defaultOrder: 1,
      },
      {
        key: "patient",
        label: "Patient details",
        description: "Patient identity, UHID, doctor, and department.",
        defaultOrder: 2,
      },
      {
        key: "billingStatus",
        label: "Billing status",
        description: "Bill/payment status, visit time, and created timestamp.",
        defaultOrder: 3,
      },
      {
        key: "itemizedTable",
        label: "Itemized table",
        description: "Line items with quantity, rate, and amount.",
        defaultOrder: 4,
      },
      {
        key: "financialSummary",
        label: "Financial summary",
        description: "Subtotal, discounts, tax, total, and balance.",
        defaultOrder: 5,
      },
      {
        key: "signatures",
        label: "Notes and signatory",
        description: "Generated note and billing sign-off block.",
        defaultOrder: 6,
      },
      {
        key: "footer",
        label: "Letterhead footer",
        description: "Optional legal or hospital footer text.",
        defaultOrder: 7,
      },
    ],
  },
  thermalBill: {
    key: "thermalBill",
    label: "Thermal bill receipt",
    description: "Compact thermal receipt optimized for front-desk printers.",
    paperLabel: "Thermal 58mm / 80mm",
    sections: [
      {
        key: "branding",
        label: "Branding header",
        description: "Display name, address, and contact phone.",
        defaultOrder: 0,
      },
      {
        key: "metadata",
        label: "Receipt metadata",
        description: "Bill number, patient identity, UHID, and receipt date.",
        defaultOrder: 1,
      },
      {
        key: "items",
        label: "Item list",
        description: "Compact item lines with rate and line amount.",
        defaultOrder: 2,
      },
      {
        key: "totals",
        label: "Totals",
        description: "Subtotal, total, paid, and balance lines.",
        defaultOrder: 3,
      },
      {
        key: "footer",
        label: "Receipt footer",
        description: "Payment status and optional footer text.",
        defaultOrder: 4,
      },
    ],
  },
  dischargeSummary: {
    key: "dischargeSummary",
    label: "Discharge summary",
    description:
      "A4 discharge document with admission, diagnosis, treatment, and sign-off.",
    paperLabel: "A4 clinical summary",
    sections: [
      {
        key: "branding",
        label: "Hospital branding",
        description: "Hospital identity and summary header.",
        defaultOrder: 0,
      },
      {
        key: "admission",
        label: "Admission details",
        description: "Admission ID, doctor, bed, admitted/discharged times.",
        defaultOrder: 1,
      },
      {
        key: "documentStatus",
        label: "Document status",
        description:
          "Summary/admission status, versioning, and finalized time.",
        defaultOrder: 2,
      },
      {
        key: "diagnosis",
        label: "Diagnosis",
        description: "Primary discharge diagnosis.",
        defaultOrder: 3,
      },
      {
        key: "hospitalCourse",
        label: "Hospital course",
        description: "Clinical course during admission.",
        defaultOrder: 4,
      },
      {
        key: "procedures",
        label: "Procedures",
        description: "Procedures completed during admission.",
        defaultOrder: 5,
      },
      {
        key: "medication",
        label: "Medication on discharge",
        description: "Medication plan at discharge.",
        defaultOrder: 6,
      },
      {
        key: "dischargeAdvice",
        label: "Discharge advice",
        description: "Instructions given at discharge.",
        defaultOrder: 7,
      },
      {
        key: "followUp",
        label: "Follow-up instructions",
        description: "Post-discharge follow-up guidance.",
        defaultOrder: 8,
      },
      {
        key: "signOff",
        label: "Clinical note and sign-off",
        description: "Footer note and doctor sign-off block.",
        defaultOrder: 9,
      },
    ],
  },
  consentDocument: {
    key: "consentDocument",
    label: "Consent document",
    description:
      "A4 consent document with patient details, rendered body, and signatures.",
    paperLabel: "A4 consent",
    sections: [
      {
        key: "branding",
        label: "Hospital branding",
        description: "Hospital identity and consent header.",
        defaultOrder: 0,
      },
      {
        key: "documentDetails",
        label: "Document details",
        description: "Patient, UHID, procedure, and admission linkage.",
        defaultOrder: 1,
      },
      {
        key: "signatureState",
        label: "Signature state",
        description: "Document status and signature requirements.",
        defaultOrder: 2,
      },
      {
        key: "content",
        label: "Rendered consent body",
        description: "The formatted consent text shown for signing.",
        defaultOrder: 3,
      },
      {
        key: "signatures",
        label: "Signature blocks",
        description: "Captured patient, witness, and doctor signatures.",
        defaultOrder: 4,
      },
    ],
  },
} as const;

export const PRINT_TEMPLATE_KEYS = Object.keys(
  PRINT_TEMPLATE_DEFINITIONS,
) as Array<keyof typeof PRINT_TEMPLATE_DEFINITIONS>;

export type PrintTemplateKey = (typeof PRINT_TEMPLATE_KEYS)[number];

export const PRINT_TEMPLATE_SECTION_KEYS = PRINT_TEMPLATE_KEYS.flatMap((key) =>
  PRINT_TEMPLATE_DEFINITIONS[key].sections.map((section) => section.key)
);

export type PrintTemplateSectionKey =
  (typeof PRINT_TEMPLATE_SECTION_KEYS)[number];

export function getPrintTemplateDefinition(templateKey: PrintTemplateKey) {
  return PRINT_TEMPLATE_DEFINITIONS[templateKey];
}

export const PRINT_CONFIG = PRINT_TEMPLATE_DEFINITIONS;
