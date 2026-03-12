import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

type DashboardRouteSkeletonProps = {
  variant?: "overview" | "directory" | "workspace" | "form";
  className?: string;
};

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass-panel rounded-[24px] p-4 sm:p-5", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-28" />
      <Skeleton className="mt-4 h-24 w-full" />
    </div>
  );
}

export function DashboardRouteSkeleton({
  variant = "directory",
  className,
}: DashboardRouteSkeletonProps) {
  const isOverview = variant === "overview";
  const isWorkspace = variant === "workspace";
  const isForm = variant === "form";

  return (
    <div className={cn("space-y-6", className)}>
      <div className="glass-panel-strong rounded-[24px] p-4 sm:p-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-10 w-full max-w-[22rem]" />
        <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        <Skeleton className="mt-2 h-4 w-full max-w-2xl" />
        <div className="mt-5 flex flex-wrap gap-3">
          <Skeleton className="h-10 w-36 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      {isOverview ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </section>
          <section className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
            <div className="glass-panel rounded-[24px] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
              <Skeleton className="mt-5 h-[22rem] w-full" />
            </div>
            <div className="glass-panel rounded-[24px] p-4 sm:p-5">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="mt-5 h-[22rem] w-full" />
            </div>
          </section>
        </>
      ) : null}

      {variant === "directory" ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </section>
          <section className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
            <div className="glass-panel rounded-[24px] p-4 sm:p-5">
              <div className="flex flex-wrap gap-3">
                <Skeleton className="h-10 min-w-[15rem] flex-1" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-28" />
              </div>
              <Skeleton className="mt-5 h-[28rem] w-full" />
            </div>
            <div className="glass-panel rounded-[24px] p-4 sm:p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-5 h-[28rem] w-full" />
            </div>
          </section>
        </>
      ) : null}

      {isWorkspace || isForm ? (
        <section
          className={cn(
            "grid gap-4",
            isForm ? "xl:grid-cols-[1.45fr_0.95fr]" : "xl:grid-cols-[1.3fr_1fr]",
          )}
        >
          <div className="glass-panel rounded-[24px] p-4 sm:p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: isForm ? 8 : 6 }).map((_, index) => (
                <div key={index}>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-11 w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-5 h-36 w-full" />
            <div className="mt-5 flex flex-wrap gap-3">
              <Skeleton className="h-10 w-36 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass-panel rounded-[24px] p-4 sm:p-5">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-5 h-48 w-full" />
            </div>
            <div className="glass-panel rounded-[24px] p-4 sm:p-5">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="mt-5 h-56 w-full" />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function PublicRouteSkeleton() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_30%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--surface)_70%,white_30%))]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="glass-panel-strong flex items-center justify-between rounded-[28px] px-5 py-4">
          <Skeleton className="h-10 w-40" />
          <div className="hidden items-center gap-3 md:flex">
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>

        <div className="glass-panel rounded-[36px] px-5 py-10 sm:px-8 lg:px-10">
          <Skeleton className="mx-auto h-4 w-28" />
          <Skeleton className="mx-auto mt-5 h-14 w-full max-w-[44rem]" />
          <Skeleton className="mx-auto mt-3 h-14 w-full max-w-[36rem]" />
          <Skeleton className="mx-auto mt-5 h-4 w-full max-w-[32rem]" />
          <div className="mt-8 flex justify-center gap-3">
            <Skeleton className="h-11 w-36 rounded-full" />
            <Skeleton className="h-11 w-36 rounded-full" />
          </div>
          <div className="mt-10 rounded-[30px] border border-border/60 bg-surface/72 p-4 sm:p-6">
            <Skeleton className="h-[28rem] w-full rounded-[24px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
