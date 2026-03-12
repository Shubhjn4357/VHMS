import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { PrintTemplateKey } from "@/constants/printConfig";
import type { PermissionKey } from "@/constants/permissions";
import { getBillById } from "@/lib/billing/service";
import { getConsentDocumentById } from "@/lib/consents/service";
import { getDischargeSummaryById } from "@/lib/discharge/service";
import { getHospitalBranding } from "@/lib/hospital/service";
import { hasEveryPermission } from "@/lib/permissions/ability";
import { getResolvedPrintTemplate } from "@/lib/print-templates/service";
import type {
  BillPrintPayload,
  ConsentPrintPayload,
  DischargePrintPayload,
} from "@/types/print";

function buildLoginUrl(pathname: string) {
  return `/login?callbackUrl=${encodeURIComponent(pathname)}`;
}

export async function requirePrintPermissions(
  pathname: string,
  requiredPermissions: PermissionKey[],
) {
  const session = await auth();

  if (!session?.user) {
    redirect(buildLoginUrl(pathname));
  }

  const permissions = session.user.permissions ?? [];

  if (!hasEveryPermission(permissions, requiredPermissions)) {
    redirect("/access-denied");
  }

  return session;
}

export async function getBillPrintPayload(
  id: string,
  templateKey: Extract<PrintTemplateKey, "a4Bill" | "thermalBill">,
): Promise<BillPrintPayload | null> {
  const [branding, bill, template] = await Promise.all([
    getHospitalBranding(),
    getBillById(id),
    getResolvedPrintTemplate(templateKey),
  ]);

  if (!bill) {
    return null;
  }

  return {
    branding,
    bill,
    template,
  };
}

export async function getDischargePrintPayload(
  id: string,
): Promise<DischargePrintPayload | null> {
  const [branding, summary, template] = await Promise.all([
    getHospitalBranding(),
    getDischargeSummaryById(id),
    getResolvedPrintTemplate("dischargeSummary"),
  ]);

  if (!summary) {
    return null;
  }

  return {
    branding,
    summary,
    template,
  };
}

export async function getConsentPrintPayload(
  id: string,
): Promise<ConsentPrintPayload | null> {
  const [branding, document, template] = await Promise.all([
    getHospitalBranding(),
    getConsentDocumentById(id),
    getResolvedPrintTemplate("consentDocument"),
  ]);

  if (!document) {
    return null;
  }

  return {
    branding,
    document,
    template,
  };
}
