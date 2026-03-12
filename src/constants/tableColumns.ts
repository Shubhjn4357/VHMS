export const TABLE_COLUMNS = {
  staffAccess: ["email", "role", "status", "updatedAt"],
  appointments: ["scheduledFor", "patient", "doctor", "status"],
  billing: ["billNumber", "patient", "total", "paymentStatus", "updatedAt"],
  occupancy: ["ward", "bed", "status", "patient"],
  blogPosts: ["title", "status", "publishedAt", "updatedAt"],
} as const;
