"use client";

import { isAdmin, isStaff } from "@/core/auth/roles";
import { useI18n } from "@/core/i18n/provider";
import { LanguageSwitcher } from "@/features/i18n/language-switcher";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { useSession } from "@/widgets/session-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Navegación principal con estado de sesión, idioma y logout seguro vía BFF.
 */
export function SiteHeader() {
  const user = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const links = [
    { href: "/partidos", label: t("nav.matches") },
    { href: "/retos", label: t("nav.challenges") },
    { href: "/equipos", label: t("nav.teams") },
    { href: "/eventos", label: t("nav.events") },
    { href: "/establecimientos", label: t("nav.venues") },
    { href: "/reservas", label: t("nav.bookings") },
  ];

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
   * Propósito: Pide confirmación antes de cerrar la sesión.
   */
  function requestLogout() {
    askConfirmation({
      title: t("nav.logoutTitle"),
      description: t("nav.logoutDescription"),
      confirmLabel: t("nav.logoutConfirm"),
      tone: "danger",
      run: handleLogout,
    });
    /**
     * Output:
     * Side effects — Abre el modal; la sesión sigue abierta hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Header sticky
   */
  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-ink/75 backdrop-blur-xl">
      {confirmationDialog}
      <div
        className={`mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6 ${
          user ? "max-w-none lg:pl-5" : "max-w-7xl"
        }`}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-lime font-display text-lg text-ink">
            C
          </span>
          <span className="font-display text-xl tracking-tight text-bone">
            CanchaYa
          </span>
        </Link>
        {/* Con sesión la navegación vive en el menú lateral (AppShell / AdminShell). */}
        <nav
          className={`hidden min-w-0 items-center gap-3 overflow-x-auto lg:gap-5 ${
            user ? "" : "md:flex"
          }`}
        >
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
              {isAdmin(user) ? t("nav.admin") : t("nav.myVenue")}
            </Link>
          ) : null}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <>
              <Link
                href="/perfil"
                className="hidden text-sm text-mist hover:text-bone lg:inline"
              >
                {user.fullName ?? user.email}
              </Link>
              <Button
                variant="secondary"
                onClick={requestLogout}
                isLoading={isLoggingOut}
              >
                {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-mist hover:text-bone">
                {t("nav.login")}
              </Link>
              <Button
                onClick={() => router.push("/registro")}
                className="hidden sm:inline-flex"
              >
                {t("nav.createAccount")}
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
