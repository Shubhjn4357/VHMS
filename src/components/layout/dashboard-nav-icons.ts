import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BellRing,
  BedDouble,
  BedSingle,
  BriefcaseMedical,
  Building2,
  Calculator,
  CalendarDays,
  CircleUserRound,
  ClipboardList,
  DoorOpen,
  FileSignature,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageSquareMore,
  Newspaper,
  Printer,
  ReceiptText,
  ScrollText,
  Settings2,
  ShieldCheck,
  SquareActivity,
  Stethoscope,
  UsersRound,
} from "lucide-react";

const dashboardNavIcons: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/analytics": BarChart3,
  "/dashboard/announcements": Megaphone,
  "/dashboard/appointments": CalendarDays,
  "/dashboard/audit-logs": SquareActivity,
  "/dashboard/billing": ReceiptText,
  "/dashboard/blog": Newspaper,
  "/dashboard/charge-master": Calculator,
  "/dashboard/communications": MessageSquareMore,
  "/dashboard/consents": FileSignature,
  "/dashboard/discharge": FileText,
  "/dashboard/discharge-summaries": ScrollText,
  "/dashboard/doctors": Stethoscope,
  "/dashboard/ipd": BedSingle,
  "/dashboard/notifications": BellRing,
  "/dashboard/occupancy": BedDouble,
  "/dashboard/opd": ClipboardList,
  "/dashboard/patients": UsersRound,
  "/dashboard/print-templates": Printer,
  "/dashboard/profile": CircleUserRound,
  "/dashboard/reports": FileSpreadsheet,
  "/dashboard/rooms": DoorOpen,
  "/dashboard/settings": Settings2,
  "/dashboard/staff": BriefcaseMedical,
  "/dashboard/staff-access": ShieldCheck,
  "/dashboard/wards": Building2,
};

export function getDashboardNavIcon(href?: string) {
  if (!href) {
    return LayoutDashboard;
  }

  return dashboardNavIcons[href] ?? LayoutDashboard;
}
