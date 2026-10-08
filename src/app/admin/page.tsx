import {
  getManagedEstablishmentCatalog,
  getManagedFieldCatalog,
} from "@/application/catalog";
import { getStaffReservationViews } from "@/application/booking";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin" };

/**
 * Propósito: Resumen operativo con 3 fetches en paralelo.
 */
export default async function AdminHomePage() {
  const [establishments, fields, reservations] = await Promise.all([
    getManagedEstablishmentCatalog(),
    getManagedFieldCatalog(),
    getStaffReservationViews(),
  ]);
  const pending = reservations.filter((item) => item.status === "pending").length;

  const stats = [
    ["Sedes", establishments.length, "/admin/establecimientos"],
    ["Canchas", fields.length, "/admin/canchas"],
    ["Reservas", reservations.length, "/admin/reservas"],
    ["Pendientes", pending, "/admin/reservas"],
  ] as const;

  /**
   * Output:
   * @returns JSX.Element — Dashboard admin
   */
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Administración"
        title="Tu sede en un vistazo"
        description="Solo ves y administras las sedes de tu organización. Los jugadores siguen siendo globales."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value, href]) => (
          <Link
            key={label}
            href={href}
            className="rounded-[28px] border border-white/8 bg-pitch p-5 hover:border-lime/30"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-mist">{label}</p>
            <p className="mt-3 font-display text-5xl text-lime">{value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
