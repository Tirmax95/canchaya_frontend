"use client";

import { isStaff } from "@/core/auth/roles";
import { Button } from "@/shared/ui/button";
import { useSession } from "@/widgets/session-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/establecimientos", label: "Sedes" },
  { href: "/canchas", label: "Canchas" },
  { href: "/reservas", label: "Reservas" },
];

/**
 * Propósito: Navegación principal con estado de sesión y logout seguro vía BFF.
 */
export function SiteHeader() {
  const user = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Propósito: Cierra sesión contra el BFF y refresca el árbol RSC.
   */
  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
    /**
     * Output:
     * Side effects — Invalida cookie y recarga navegación
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Header sticky
   */
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-ink/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-lime font-display text-lg text-ink">
            C
          </span>
          <span className="font-display text-xl tracking-tight text-bone">
            CanchaYa
          </span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition ${
                pathname.startsWith(link.href)
                  ? "text-lime"
                  : "text-mist hover:text-bone"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {user && isStaff(user) ? (
            <Link
              href="/admin"
              className={`text-sm transition ${
                pathname.startsWith("/admin")
                  ? "text-lime"
                  : "text-mist hover:text-bone"
              }`}
            >
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/perfil"
                className="hidden text-sm text-mist hover:text-bone sm:inline"
              >
                {user.fullName ?? user.email}
              </Link>
              <Button
                variant="secondary"
                onClick={handleLogout}
                isLoading={isLoggingOut}
              >
                Salir
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-mist hover:text-bone">
                Entrar
              </Link>
              <Button
                onClick={() => router.push("/registro")}
                className="hidden sm:inline-flex"
              >
                Crear cuenta
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
