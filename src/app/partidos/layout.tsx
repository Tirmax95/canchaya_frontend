import { guardStaffExploreModule } from "@/application/admin-access";

/**
 * Propósito: Partidos para el staff solo si el super admin habilitó el módulo `matches` para
 * su tenant. Los jugadores entran siempre.
 */
export default async function PartidosLayout({ children }: { children: React.ReactNode }) {
  await guardStaffExploreModule("matches");
  /**
   * Output:
   * @returns React.ReactNode — Sección, o redirect al panel si el módulo está apagado
   */
  return children;
}
