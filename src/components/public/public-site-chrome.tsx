import type { ReactNode } from "react";
import { getHospitalBranding } from "@/lib/hospital/service";
import { PublicNavbar } from "./public-navbar";
import { PublicFooter } from "./public-footer";

export async function PublicSiteChrome({
  children,
}: {
  children: ReactNode;
}) {
  const hospital = await getHospitalBranding();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PublicNavbar hospital={hospital} />
        <main className="mt-8">{children}</main>
        <PublicFooter />
      </div>
    </div>
  );
}
