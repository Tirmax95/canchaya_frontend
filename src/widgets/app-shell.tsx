"use client";

import { useI18n } from "@/core/i18n/provider";
import type { SideMenuModel } from "@/features/navigation/build-menu";
import { CompactMenu, MenuSection } from "@/features/navigation/side-menu";
import {
  SIDEBAR_COLLAPSED_VALUE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_EXPANDED_VALUE,
} from "@/features/navigation/sidebar-preference";
import { cn } from "@/shared/lib/cn";
import { usePathname } from "next/navigation";
import { useState } from "react";

const SIDEBAR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/**
 * Propósito: Marco de la app. Con sesión pinta un único menú lateral fijo a la izquierda
 * (el mismo en todas las rutas, /admin incluido) que se puede colapsar a solo íconos; la
 * preferencia queda en una cookie para que el servidor la pinte igual sin parpadeo.
 */
export function AppShell({
  menu,
  initialCollapsed,
  footer,
  children,
}: {
  menu: SideMenuModel | null;
  initialCollapsed: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);

  if (!menu) {
    /**
     * Output:
     * @returns JSX.Element — Contenido sin sidebar (visitante o 2FA pendiente)
     */
    return (
      <>
        <main className="flex-1">{children}</main>
        {footer}
      </>
    );
  }

  /**
   * Propósito: Alterna el modo íconos y lo recuerda.
   */
  function toggleCollapsed() {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextCollapsed ? SIDEBAR_COLLAPSED_VALUE : SIDEBAR_EXPANDED_VALUE}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
    /**
     * Output:
     * Side effects — Cambia el ancho del sidebar y persiste la cookie
     */
  }

  const allItems = menu.sections.flatMap((section) => section.items);

  /**
   * Output:
   * @returns JSX.Element — Sidebar fijo + columna de contenido
   */
  return (
    <div className="flex flex-1">
      <aside
        className={cn(
          "sticky top-16 hidden h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-white/8 bg-pitch/50 transition-[width] duration-200 lg:flex",
          isCollapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className={cn("border-b border-white/8 py-4", isCollapsed ? "px-3" : "px-5")}>
          {isCollapsed ? (
            <span
              title={menu.workspaceLabel}
              className="mx-auto grid size-10 place-items-center rounded-lg bg-white/5 font-display text-sm text-lime"
            >
              {menu.workspaceLabel.charAt(0).toUpperCase()}
            </span>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-lime">
                {menu.workspaceEyebrow}
              </p>
              <p className="mt-1 truncate font-display text-base text-bone" title={menu.workspaceLabel}>
                {menu.workspaceLabel}
              </p>
            </>
          )}
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-4">
          {menu.sections.map((section) => (
            <MenuSection
              key={section.title}
              title={section.title}
              items={section.items}
              pathname={pathname}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>

        <div className="border-t border-white/8 p-3">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg text-sm text-mist transition hover:bg-white/5 hover:text-bone",
              isCollapsed ? "mx-auto w-10 justify-center" : "w-full px-3",
            )}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={cn("size-[18px] shrink-0 transition-transform", isCollapsed && "rotate-180")}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 4h16v16H4V4Zm5 0v16m6-11-3 3 3 3" />
            </svg>
            <span className={cn("whitespace-nowrap", isCollapsed && "sr-only")}>
              {isCollapsed ? t("nav.expandMenu") : t("nav.collapseMenu")}
            </span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <CompactMenu label={t("nav.menuLabel")} items={allItems} pathname={pathname} />
        <main className="flex-1">{children}</main>
        {footer}
      </div>
    </div>
  );
}
