import { requireSession } from "@/core/auth/session";
import { CreateMatchForm } from "@/features/pickup/create-match-form";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Convocar partido" };

/**
 * Propósito: Alta de un partido convocado. Exige sesión.
 */
export default async function NewPickupMatchPage() {
  await requireSession();
  /**
   * Output:
   * @returns JSX.Element — Formulario
   */
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Organiza"
        title="Convoca tu partido"
        description="Publica cupos, cobra y arma la cancha en minutos."
      />
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
        <CreateMatchForm />
      </div>
    </div>
  );
}
