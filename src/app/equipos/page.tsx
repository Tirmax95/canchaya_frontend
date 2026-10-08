import { requireSession } from "@/core/auth/session";
import { listMyTeams, listTeamInvites } from "@/data/pickup.repository";
import { TeamPanel } from "@/features/pickup/team-panel";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Equipos" };

/**
 * Propósito: Equipos e invitaciones del jugador autenticado.
 */
export default async function EquiposPage() {
  const session = await requireSession();
  const [teams, invites] = await Promise.all([
    listMyTeams(),
    listTeamInvites(),
  ]);

  /**
   * Output:
   * @returns JSX.Element — Plantillas
   */
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Plantilla"
        title="Tus equipos"
        description="Crea un equipo, invita por celular y prepárate para retar."
      />
      <TeamPanel teams={teams} invites={invites} userId={session.id} />
    </div>
  );
}
