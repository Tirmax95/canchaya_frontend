import { listEstablishments } from "@/data/establishment.repository";
import { DeleteButton } from "@/features/admin/delete-button";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin · Sedes" };

/**
 * Propósito: Tabla de sedes con acciones de edición y borrado.
 */
export default async function AdminEstablishmentsPage() {
  const establishments = await listEstablishments();

  /**
   * Output:
   * @returns JSX.Element — CRUD list
   */
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Sedes"
        title="Establecimientos"
        action={
          <Link
            href="/admin/establecimientos/nuevo"
            className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink"
          >
            Nueva sede
          </Link>
        }
      />
      <div className="overflow-hidden rounded-[28px] border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/4 text-mist">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Dirección</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {establishments.map((establishment) => (
              <tr
                key={establishment.establishmentId}
                className="border-t border-white/8"
              >
                <td className="px-4 py-3 text-bone">{establishment.name}</td>
                <td className="px-4 py-3 text-mist">{establishment.address}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/establecimientos/${establishment.establishmentId}`}
                      className="text-lime hover:underline"
                    >
                      Editar
                    </Link>
                    <DeleteButton
                      href={`/api/establishments/${establishment.establishmentId}`}
                      label={establishment.name}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
