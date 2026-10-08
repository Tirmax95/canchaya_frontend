import { requireSession } from "@/core/auth/session";
import { listMyRetos, listMyTeams } from "@/data/pickup.repository";
import { RetoPanel } from "@/features/pickup/reto-panel";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Retos" };

/**
 * Propósito: Retos entre equipos del usuario.
 */
export default async function RetosPage() {
  const session = await requireSession();
  const [retos, teams] = await Promise.all([listMyRetos(), listMyTeams()]);
  const isCaptain = teams.some((team) => team.captainId === session.id);

  /**
   * Output:
   * @returns JSX.Element — Tablero de retos
   */
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Desafío"
        title="Retos"
        description="El capitán reta. Si aceptan, nace un partido draft para llenar."
      />
      <RetoPanel retos={retos} isCaptain={isCaptain} />
    </div>
  );
}
