import { requireTenantOwnerAccess } from "@/application/admin-access";
import { getTeam } from "@/data/team.repository";
import { PanelSection } from "@/features/admin/platform/platform-ui";
import { TeamManager } from "@/features/admin/team/team-manager";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin · Equipo" };

/**
 * Propósito: El dueño gestiona quién más administra cada uno de sus tenants.
 */
export default async function TeamPage() {
  const access = await requireTenantOwnerAccess();
  const teams = await Promise.all(
    access.ownedTenants.map(async (tenant) => ({ tenant, team: await getTeam(tenant.organizationId) })),
  );

  /**
   * Output:
   * @returns JSX.Element — Equipo por tenant
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Cuenta"
        title="Equipo"
        description="Invita managers para que te ayuden con reservas, sedes y canchas. La facturación y el equipo siguen siendo solo tuyos."
      />
      {teams.map(({ tenant, team }) => (
        <PanelSection key={tenant.organizationId} title={tenant.organizationName}>
          <TeamManager
            organizationId={tenant.organizationId}
            members={team.members}
            invitations={team.invitations}
            isReadOnly={access.isReadOnly || !tenant.isOperable}
          />
        </PanelSection>
      ))}
    </div>
  );
}
