import { listManagedEstablishments } from "@/data/establishment.repository";
import { EstablishmentForm } from "@/features/admin/establishment-form";
import { PageHeader } from "@/shared/ui/page-header";
import { notFound } from "next/navigation";

/**
 * Propósito: Edición de una sede existente.
 */
export default async function EditEstablishmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  try {
    const establishments = await listManagedEstablishments();
    const establishment = establishments.find(
      (item) => item.establishmentId === id,
    );
    if (!establishment) {
      notFound();
    }
    return (
      <div className="mx-auto max-w-xl space-y-8">
        <PageHeader kicker="Sedes" title="Editar sede" />
        <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
          <EstablishmentForm establishment={establishment} />
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
