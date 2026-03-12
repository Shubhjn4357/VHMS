export const DEFAULT_FORM_VALUES = {
  staffAccess: {
    email: "",
    role: "RECEPTION_STAFF",
    status: "PENDING",
  },
  patient: {
    firstName: "",
    lastName: "",
    gender: "UNKNOWN",
    phone: "",
    bloodGroup: "",
  },
  appointment: {
    visitType: "SCHEDULED",
    status: "SCHEDULED",
    notes: "",
  },
  bill: {
    discount: 0,
    tax: 0,
    notes: "",
  },
  blogPost: {
    title: "",
    slug: "",
    categoryId: null,
    status: "DRAFT",
    excerpt: "",
    body: "",
  },
} as const;
