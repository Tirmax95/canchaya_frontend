import { getManagedFieldCatalog } from "@/application/catalog";
import { DeleteButton } from "@/features/admin/delete-button";
import { formatMoney } from "@/shared/lib/money";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin · Canchas" };

/**
 * Propósito: Inventario de canchas con acciones staff.
 */
export default async function AdminFieldsPage() {
  const fields = await getManagedFieldCatalog();

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Canchas"
        title="Inventario"
        action={
          <Link
            href="/admin/canchas/nueva"
            className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink"
          >
            Nueva cancha
          </Link>
        }
      />
      <div className="overflow-hidden rounded-[28px] border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/4 text-mist">
            <tr>
              <th className="px-4 py-3 font-medium">Cancha</th>
              <th className="px-4 py-3 font-medium">Sede</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field.id} className="border-t border-white/8">
                <td className="px-4 py-3 text-bone">{field.numberField}</td>
                <td className="px-4 py-3 text-mist">{field.establishmentName}</td>
                <td className="px-4 py-3 text-bone">
                  {formatMoney(field.basePricePerHour)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/canchas/${field.id}`}
                      className="text-lime hover:underline"
                    >
                      Editar
                    </Link>
                    <DeleteButton
                      href={`/api/fields/${field.id}`}
                      label={`cancha ${field.numberField}`}
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
