"use client";

import type { SessionUser } from "@/domain/user";
import { createContext, useContext } from "react";

const SessionContext = createContext<SessionUser | null>(null);

/**
 * Propósito: Comparte la sesión hidratada desde el server layout.
 */
export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser | null;
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
export function useSession(): SessionUser | null {
  /**
   * Output:
   * @returns SessionUser | null — Usuario actual o anónimo
   */
  return useContext(SessionContext);
}
