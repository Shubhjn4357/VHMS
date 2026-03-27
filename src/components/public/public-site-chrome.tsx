import type { ReactNode } from "react";
import { getHospitalBranding } from "@/lib/hospital/service";
import { PublicNavbar } from "./public-navbar";
import { PublicFooter } from "./public-footer";

export async function PublicSiteChrome({
  children,
  extraLinks,
}: {
  children: ReactNode;
  extraLinks?: { label: string; href: string }[];
}) {
  const hospital = await getHospitalBranding();

  return (
    <div className="public-site-frame">
      <div className="public-site-inner mx-auto px-4 py-5 sm:px-6 lg:px-8">
        <PublicNavbar extraLinks={extraLinks} hospital={hospital} />
        <main className="mt-8">{children}</main>
        <PublicFooter />
      </div>
    </div>
  );
}
