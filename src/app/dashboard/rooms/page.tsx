import { dashboardRoomsMetadata as metadata } from "@/app/dashboard/page-metadata";
import Link from "next/link";
import { BedDouble, Building2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SurfaceCard } from "@/components/ui/surface-card";
import { listWardManagement } from "@/lib/wards/service";

export { metadata };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardRoomsPage() {
  const workspace = await listWardManagement();
  const rooms = workspace.entries.flatMap((ward) =>
    ward.rooms.map((room) => ({
      ...room,
      wardFloor: ward.floor,
      utilization: room.totalBeds > 0 ? Math.round((room.occupiedBeds / room.totalBeds) * 100) : 0,
    }))
  );
  const highUtilizationRooms = [...rooms]
    .sort((left, right) => right.utilization - left.utilization)
    .slice(0, 4);
  const averageDailyCharge = rooms.length > 0
    ? Math.round(rooms.reduce((total, room) => total + room.dailyCharge, 0) / rooms.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facility inventory"
        title="Rooms"
        description="Review room inventory, ward placement, pricing, and bed utilization from a room-first operational route."
        actions={
          <>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/occupancy">
              Open occupancy board
            </Link>
            <Link className={buttonVariants({ variant: "outline" })} href="/dashboard/wards">
              Manage wards and beds
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Total rooms</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.totalRooms}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Hospital rooms currently mapped inside ward inventory.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Beds attached</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.totalBeds}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Bed slots connected to room masters across all wards.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Occupied beds</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {workspace.summary.occupiedBeds}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Current occupied capacity reflected from the live bed state.
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">Average daily charge</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {formatCurrency(averageDailyCharge)}
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Average configured room pricing across the current inventory.
          </p>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Room inventory
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Dedicated room directory with ward context, pricing, and live capacity split.
              </p>
            </div>
            <Building2 className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 grid gap-3">
            {rooms.length > 0
              ? rooms.map((room) => (
                <div className="glass-panel-muted rounded-[22px] p-4" key={room.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Room {room.roomNumber}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {room.wardName}
                        {room.wardFloor ? ` · ${room.wardFloor}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{room.roomType}</Badge>
                      <Badge variant={room.occupiedBeds > 0 ? "warning" : "success"}>
                        {room.occupiedBeds}/{room.totalBeds} occupied
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em]">Daily charge</p>
                      <p className="mt-1 font-medium text-foreground">{formatCurrency(room.dailyCharge)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em]">Available beds</p>
                      <p className="mt-1 font-medium text-foreground">{room.availableBeds}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em]">Utilization</p>
                      <p className="mt-1 font-medium text-foreground">{room.utilization}%</p>
                    </div>
                  </div>
                </div>
              ))
              : (
                <EmptyState
                  className="min-h-56"
                  description="Create wards and rooms from the ward master to populate this room directory."
                  icon={Building2}
                  title="No rooms available"
                />
              )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                Highest utilization
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Rooms currently carrying the heaviest occupancy load.
              </p>
            </div>
            <BedDouble className="h-5 w-5 text-brand" />
          </div>

          <div className="mt-5 space-y-3">
            {highUtilizationRooms.length > 0
              ? highUtilizationRooms.map((room) => (
                <div className="glass-panel-muted rounded-[22px] p-4" key={room.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Room {room.roomNumber}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{room.wardName}</p>
                    </div>
                    <Badge variant={room.utilization >= 80 ? "warning" : "success"}>
                      {room.utilization}%
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    {room.occupiedBeds} occupied of {room.totalBeds} total beds.
                  </p>
                </div>
              ))
              : (
                <EmptyState
                  className="min-h-56"
                  description="Utilization highlights will appear once rooms and beds are configured."
                  icon={BedDouble}
                  title="No utilization data yet"
                />
              )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
