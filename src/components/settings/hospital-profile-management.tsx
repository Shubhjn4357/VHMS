"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, RefreshCcw } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "@/components/feedback/empty-state";
import { UploadField } from "@/components/forms/upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Textarea } from "@/components/ui/textarea";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import {
  useHospitalProfile,
  useUpdateHospitalProfile,
} from "@/hooks/useHospitalProfile";
import { updateHospitalProfileSchema } from "@/lib/validators/hospital";

type HospitalProfileInput = z.input<typeof updateHospitalProfileSchema>;
type HospitalProfileValues = z.output<typeof updateHospitalProfileSchema>;

const defaultValues: HospitalProfileInput = {
  legalName: "",
  displayName: "",
  registrationNumber: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  logoUrl: "",
  letterheadFooter: "",
};

type HospitalProfileManagementProps = {
  hideHeader?: boolean;
};

export function HospitalProfileManagement({
  hideHeader = false,
}: HospitalProfileManagementProps) {
  const profileQuery = useHospitalProfile();
  const updateMutation = useUpdateHospitalProfile();
  const { canAccess: canManage } = useModuleAccess(["settings.manage"]);

  const form = useForm<HospitalProfileInput, unknown, HospitalProfileValues>({
    resolver: zodResolver(updateHospitalProfileSchema),
    defaultValues,
  });
  const logoUrlValue = useWatch({
    control: form.control,
    name: "logoUrl",
    defaultValue: defaultValues.logoUrl,
  });

  useEffect(() => {
    if (!profileQuery.data) {
      return;
    }

    form.reset({
      legalName: profileQuery.data.legalName,
      displayName: profileQuery.data.displayName,
      registrationNumber: profileQuery.data.registrationNumber ?? "",
      contactEmail: profileQuery.data.contactEmail ?? "",
      contactPhone: profileQuery.data.contactPhone ?? "",
      address: profileQuery.data.address ?? "",
      logoUrl: profileQuery.data.logoUrl ?? "",
      letterheadFooter: profileQuery.data.letterheadFooter ?? "",
    });
  }, [form, profileQuery.data]);

  function handleSubmit(values: HospitalProfileValues) {
    updateMutation.mutate(values);
  }

  if (profileQuery.isLoading) {
    return (
      <EmptyState
        className="min-h-[30rem]"
        description="Hospital branding and contact identity are being loaded."
        icon={Loader2}
        title="Loading hospital profile"
      />
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <EmptyState
        className="min-h-[30rem]"
        description={profileQuery.error instanceof Error
          ? profileQuery.error.message
          : "The hospital profile could not be loaded."}
        icon={Building2}
        title="Hospital profile unavailable"
      />
    );
  }

  return (
    <div className="space-y-6">
      {hideHeader
        ? null
        : (
          <PageHeader
            eyebrow="Hospital identity"
            title="Branding and print profile"
            description="Manage the hospital name, logo, footer, and contact details used across print templates and public pages."
            actions={(
              <Button
                onClick={() => void profileQuery.refetch()}
                size="sm"
                type="button"
                variant="outline"
              >
                {profileQuery.isFetching
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <RefreshCcw className="h-4 w-4" />}
                Refresh
              </Button>
            )}
          />
        )}

      <SurfaceCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Print and public identity
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              Hospital profile
            </h2>
          </div>
        </div>

        {canManage
          ? (
            <form
              className="mt-6 space-y-5"
              onSubmit={form.handleSubmit(handleSubmit)}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-ink">Display name</span>
                  <Input {...form.register("displayName")} className="mt-2" />
                  <p className="mt-2 text-sm text-danger">
                    {form.formState.errors.displayName?.message}
                  </p>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Legal name</span>
                  <Input {...form.register("legalName")} className="mt-2" />
                  <p className="mt-2 text-sm text-danger">
                    {form.formState.errors.legalName?.message}
                  </p>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-ink">
                    Registration number
                  </span>
                  <Input
                    {...form.register("registrationNumber")}
                    className="mt-2"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Contact email</span>
                  <Input
                    {...form.register("contactEmail")}
                    className="mt-2"
                    placeholder="ops@hospital.in"
                  />
                  <p className="mt-2 text-sm text-danger">
                    {form.formState.errors.contactEmail?.message}
                  </p>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-ink">Contact phone</span>
                  <Input
                    {...form.register("contactPhone")}
                    className="mt-2"
                    placeholder="+91-141-0000000"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-ink">Address</span>
                <Textarea
                  {...form.register("address")}
                  className="mt-2 min-h-24"
                />
              </label>

              <UploadField
                description="Used in the public site header and print-safe documents."
                label="Hospital logo"
                  onChange={(value) =>
                    form.setValue("logoUrl", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })}
                  target="HOSPITAL_LOGO"
                  value={logoUrlValue ?? ""}
                />

              <label className="block">
                <span className="text-sm font-medium text-ink">
                  Letterhead footer
                </span>
                <Textarea
                  {...form.register("letterheadFooter")}
                  className="mt-2 min-h-24"
                  placeholder="Emergency contact lines, legal footer, or billing disclaimers."
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <Button disabled={updateMutation.isPending} type="submit">
                  {updateMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Building2 className="h-4 w-4" />}
                  Save hospital profile
                </Button>
                <Button
                  onClick={() =>
                    form.reset({
                      legalName: profileQuery.data.legalName,
                      displayName: profileQuery.data.displayName,
                      registrationNumber:
                        profileQuery.data.registrationNumber ?? "",
                      contactEmail: profileQuery.data.contactEmail ?? "",
                      contactPhone: profileQuery.data.contactPhone ?? "",
                      address: profileQuery.data.address ?? "",
                      logoUrl: profileQuery.data.logoUrl ?? "",
                      letterheadFooter:
                        profileQuery.data.letterheadFooter ?? "",
                    })}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Reset
                </Button>
              </div>
            </form>
          )
          : (
            <EmptyState
              className="mt-6 min-h-56"
              description="Viewing settings is allowed, but changing hospital branding requires settings.manage."
              icon={Building2}
              title="Hospital profile is read-only"
            />
          )}
      </SurfaceCard>
    </div>
  );
}
