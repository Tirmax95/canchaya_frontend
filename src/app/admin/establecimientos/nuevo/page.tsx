import { requireAdminModule } from "@/application/admin-access";
import { EstablishmentForm } from "@/features/admin/establishment-form";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nueva sede" };

/**
 * Propósito: Alta de sede. Requiere el módulo de sedes habilitado para el tenant.
 */
export default async function NewEstablishmentPage() {
  await requireAdminModule("establishments");
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader kicker="Sedes" title="Nueva sede" />
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
        <EstablishmentForm />
      </div>
    </div>
  );
}
