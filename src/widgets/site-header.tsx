"use client";

import { isAdmin, isStaff } from "@/core/auth/roles";
import { useI18n } from "@/core/i18n/provider";
import { LanguageSwitcher } from "@/features/i18n/language-switcher";
import { Button } from "@/shared/ui/button";
import { buttonClassName } from "@/shared/ui/button-styles";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { useSession } from "@/widgets/session-provider";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const links = [
    { href: "/partidos", label: t("nav.matches") },
    { href: "/retos", label: t("nav.challenges") },
    { href: "/equipos", label: t("nav.teams") },
    { href: "/eventos", label: t("nav.events") },
    { href: "/establecimientos", label: t("nav.venues") },
    { href: "/reservas", label: t("nav.bookings") },
  ];

  useEffect(() => {
    /**
     * Propósito: Marca el header como "scrolleado" para opacar el fondo.
     */
    function handleScroll() {
      setIsScrolled(window.scrollY > 8);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Al navegar, el menú móvil se cierra solo.
    setIsMenuOpen(false);
  }, [pathname]);

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
   * Propósito: Clases de un enlace de navegación según si su ruta está activa.
   */
  function navLinkClassName(href: string): string {
    const isActive = pathname.startsWith(href);
    /**
     * Output:
     * @returns string — className del enlace (pill sutil cuando está activo)
     */
    return `relative rounded-full px-3.5 py-1.5 text-[13px] font-medium tracking-wide transition-colors duration-200 ${
      isActive
        ? "bg-white/[0.07] text-bone shadow-[inset_0_0_0_1px_rgba(244,239,228,0.08)]"
        : "text-mist/80 hover:text-bone"
    }`;
  }

  const staffLink =
    user && isStaff(user)
      ? { href: "/admin", label: isAdmin(user) ? t("nav.admin") : t("nav.myVenue") }
      : null;
  const navLinks = staffLink ? [...links, staffLink] : links;

  /**
   * Output:
   * @returns JSX.Element — Header sticky
   */
  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        isScrolled || isMenuOpen
          ? "bg-ink/85 backdrop-blur-xl"
          : "bg-ink/40 backdrop-blur-md"
      }`}
    >
      {confirmationDialog}
      <div
        className={`mx-auto flex h-[68px] items-center justify-between gap-6 px-4 sm:px-6 ${
          user ? "max-w-none lg:pl-5" : "max-w-7xl"
        }`}
      >
        <Link
          href="/"
          aria-label="CanchaYa"
          className="group flex shrink-0 items-center gap-2.5"
        >
          <BrandMark />
          <span className="font-display text-[19px] font-semibold tracking-[-0.02em] text-bone">
            Cancha<span className="text-lime">Ya</span>
          </span>
        </Link>
        {/* Con sesión la navegación vive en el menú lateral (AppShell / AdminShell). */}
        <nav
          aria-label={t("nav.explore")}
          className={`hidden min-w-0 items-center gap-0.5 rounded-full border border-white/[0.06] bg-white/[0.025] p-1 ${
            user ? "" : "md:flex"
          }`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              className={navLinkClassName(link.href)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          <LanguageSwitcher />
          <span aria-hidden className="hidden h-5 w-px bg-white/10 sm:block" />
          {user ? (
            <>
              <Link
                href="/perfil"
                className="hidden text-[13px] font-medium text-mist/80 transition-colors hover:text-bone lg:inline"
              >
                {user.fullName ?? user.email}
              </Link>
              <Button
                variant="secondary"
                onClick={requestLogout}
                isLoading={isLoggingOut}
                className="px-4 py-2 text-[13px]"
              >
                {t("nav.logout")}
              </Button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-[13px] font-medium text-mist/80 transition-colors hover:text-bone sm:inline"
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/registro"
                className={buttonClassName(
                  "primary",
                  "group/cta hidden py-2 pl-4 pr-3.5 text-[13px] shadow-[0_8px_24px_-12px_rgba(214,242,106,0.6)] sm:inline-flex",
                )}
              >
                {t("nav.createAccount")}
                <ArrowIcon />
              </Link>
              <button
                type="button"
                aria-label={t("nav.menuLabel")}
                aria-expanded={isMenuOpen}
                aria-controls="site-mobile-menu"
                onClick={() => setIsMenuOpen((open) => !open)}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-bone transition-colors hover:bg-white/[0.06] md:hidden"
              >
                <MenuIcon isOpen={isMenuOpen} />
              </button>
            </>
          )}
        </div>
      </div>
      {/* Línea inferior con degradado: separa sin pesar visualmente. */}
      <div
        aria-hidden
        className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      {!user && isMenuOpen ? (
        <div
          id="site-mobile-menu"
          className="border-b border-white/[0.06] bg-ink/95 px-4 pb-5 pt-3 backdrop-blur-xl md:hidden"
        >
          <nav aria-label={t("nav.explore")} className="flex flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium transition-colors ${
                  pathname.startsWith(link.href)
                    ? "bg-white/[0.06] text-bone"
                    : "text-mist hover:bg-white/[0.04] hover:text-bone"
                }`}
              >
                {link.label}
                {pathname.startsWith(link.href) ? (
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-lime" />
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-4">
            <Link href="/login" className={buttonClassName("secondary")}>
              {t("nav.login")}
            </Link>
            <Link href="/registro" className={buttonClassName("primary")}>
              {t("nav.createAccount")}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/**
 * Propósito: Isotipo de la marca: una cancha estilizada sobre fondo lima.
 */
function BrandMark() {
  /**
   * Output:
   * @returns JSX.Element — SVG decorativo de 34px
   */
  return (
    <span className="relative grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-lime shadow-[0_0_0_1px_rgba(214,242,106,0.35),0_8px_20px_-10px_rgba(214,242,106,0.7)] transition-transform duration-300 group-hover:-rotate-6">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px] text-ink"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M12 5v14" />
        <circle cx="12" cy="12" r="2.6" />
      </svg>
    </span>
  );
}

/**
 * Propósito: Flecha del CTA principal; se desplaza al pasar el cursor.
 */
function ArrowIcon() {
  /**
   * Output:
   * @returns JSX.Element — SVG decorativo
   */
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/**
 * Propósito: Icono hamburguesa que se convierte en cruz al abrir el menú móvil.
 */
function MenuIcon({ isOpen }: { isOpen: boolean }) {
  /**
   * Output:
   * @returns JSX.Element — SVG decorativo
   */
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      {isOpen ? (
        <path d="M5 5l10 10M15 5L5 15" />
      ) : (
        <path d="M3.5 6.5h13M3.5 13.5h13" />
      )}
    </svg>
  );
}
