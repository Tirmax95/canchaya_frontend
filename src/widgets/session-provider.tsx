"use client";

import type { ClientSessionUser } from "@/domain/user";
import { createContext, useContext } from "react";

const SessionContext = createContext<ClientSessionUser | null>(null);

/**
 * Propósito: Comparte la sesión hidratada desde el server layout.
 */
export function SessionProvider({
  user,
  children,
}: {
  user: ClientSessionUser | null;
  children: React.ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Contexto de sesión
   */
  return (
    <SessionContext.Provider value={user}>{children}</SessionContext.Provider>
  );
}

/**
 * Propósito: Lee la sesión en componentes cliente sin refetch.
 */
export function useSession(): ClientSessionUser | null {
  /**
   * Output:
   * @returns ClientSessionUser | null — Usuario actual o anónimo
   */
  return useContext(SessionContext);
}
