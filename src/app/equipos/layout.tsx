import { guardStaffExploreModule } from "@/application/admin-access";

/**
 * Propósito: Equipos para el staff solo si el super admin habilitó el módulo `teams` para
 * su tenant. Los jugadores entran siempre.
 */
export default async function EquiposLayout({ children }: { children: React.ReactNode }) {
  await guardStaffExploreModule("teams");
  /**
   * Output:
   * @returns React.ReactNode — Sección, o redirect al panel si el módulo está apagado
   */
  return children;
}
