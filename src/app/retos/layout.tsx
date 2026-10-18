import { guardStaffExploreModule } from "@/application/admin-access";

/**
 * Propósito: Retos para el staff solo si el super admin habilitó el módulo `challenges` para
 * su tenant. Los jugadores entran siempre.
 */
export default async function RetosLayout({ children }: { children: React.ReactNode }) {
  await guardStaffExploreModule("challenges");
  /**
   * Output:
   * @returns React.ReactNode — Sección, o redirect al panel si el módulo está apagado
   */
  return children;
}
