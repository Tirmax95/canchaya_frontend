"use client";

import type { TenantModule } from "@/domain/tenant-modules";
import { cn } from "@/shared/lib/cn";
import Link from "next/link";

const ADMIN_HOME_PATH = "/admin";

export type SideMenuIcon =
  | TenantModule
  | "overview"
  | "tenants"
  | "billing"
  | "users"
  | "reports"
  | "audit"
  | "logs"
  | "emails"
  | "team"
  | "payments"
  | "matches"
  | "challenges"
  | "teams"
  | "venues"
  | "bookings"
  | "profile"
  | "messages";

export interface SideMenuItem {
  href: string;
  label: string;
  icon: SideMenuIcon;
  /** Contador (p. ej. mensajes sin leer); 0 o ausente no se muestra. */
  badge?: number;
}

const MENU_ICON_PATHS: Record<SideMenuIcon, string> = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  establishments: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
  fields: "M3 5h18v14H3V5Zm9 0v14M3 9h3v6H3m18-6h-3v6h3M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
  reservations: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8 2.5 2.5L16 10",
  events: "M8 21h8m-4-4v4m-5-17h10v5a5 5 0 0 1-10 0V4Zm0 2H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3",
  overview: "M4 19V9m5 10V5m5 14v-7m5 7V8M3 21h18",
  tenants: "M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  billing: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74",
  reports: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 17v-3m3 3v-6m3 6v-2",
  audit: "M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5",
  logs: "M10 7h9M10 12h9M10 17h6",
  emails: "M4 6h16v12H4V6Zm0 0 8 7 8-7",
  team: "M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m7-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9-1v6m3-3h-6",
  staff: "M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m7-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9-1v6m3-3h-6",
  payments: "M4 9h16v10H4V9Zm3-4h10l2 4H5l2-4Zm5 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
  matches: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4 3.5 2.5-1.3 4h-4.4l-1.3-4L12 7Zm0-4v4m8.5 2.5-5 0M3.5 9.5h5m5.7 4.5 2.8 4.5m-8.4-4.5L6 18.5",
  challenges: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  teams: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74",
  venues: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  bookings: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8 2.5 2.5L16 10",
  profile: "M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  messages: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4h-.5A1.5 1.5 0 0 1 4 15.5v-9Z",
};

const FALLBACK_MENU_ICON_PATH = "M4 6h16M4 12h16M4 18h10";

/**
 * Propósito: Resuelve el trazo del ícono del menú. Si falta la clave, usa un listado
 * genérico para que el ítem nunca quede en blanco.
 */
function menuIconPath(icon: SideMenuIcon): string {
  /**
   * Output:
   * @returns string — Atributo `d` del SVG
   */
  return MENU_ICON_PATHS[icon] || FALLBACK_MENU_ICON_PATH;
}

/**
 * Propósito: True si el ítem corresponde a la ruta actual. El dashboard solo coincide exacto
 * para no quedar activo en todas las subrutas de /admin.
 */
export function isMenuItemActive(href: string, pathname: string): boolean {
  /**
   * Output:
   * @returns boolean — Ítem activo
   */
  return href === ADMIN_HOME_PATH ? pathname === href : pathname.startsWith(href);
}

/**
 * Propósito: Grupo titulado de enlaces del sidebar.
 */
export function MenuSection({
  title,
  items,
  pathname,
  isCollapsed = false,
}: {
  title: string;
  items: SideMenuItem[];
  pathname: string;
  isCollapsed?: boolean;
}) {
  if (items.length === 0) {
    /**
     * Output:
     * @returns null — Sección vacía no se pinta
     */
    return null;
  }
  /**
   * Output:
   * @returns JSX.Element — Lista de enlaces
   */
  return (
    <nav aria-label={title} className="space-y-0.5">
      {isCollapsed ? (
        <div aria-hidden="true" className="mx-auto mb-2 h-px w-6 bg-white/10" />
      ) : (
        <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/60">
          {title}
        </p>
      )}
      {items.map((item) => (
        <MenuLink
          key={item.href}
          item={item}
          isActive={isMenuItemActive(item.href, pathname)}
          isCollapsed={isCollapsed}
        />
      ))}
    </nav>
  );
}

/**
 * Propósito: Fila horizontal de chips para pantallas sin sidebar (móvil y tablet).
 */
export function CompactMenu({
  label,
  items,
  pathname,
}: {
  label: string;
  items: SideMenuItem[];
  pathname: string;
}) {
  /**
   * Output:
   * @returns JSX.Element — Nav con scroll horizontal, oculta en desktop
   */
  return (
    <nav
      aria-label={label}
      className="flex gap-2 overflow-x-auto border-b border-white/8 px-4 py-3 sm:px-6 lg:hidden"
    >
      {items.map((item) => (
        <MenuLink
          key={item.href}
          item={item}
          isActive={isMenuItemActive(item.href, pathname)}
          isCompact
        />
      ))}
    </nav>
  );
}

/**
 * Propósito: Glifo del ítem del sidebar. Logs usa puntos rellenos + líneas: el path de
 * documento con arcos no se pintaba a 18px con fill none.
 */
function MenuIcon({ icon }: { icon: SideMenuIcon }) {
  /**
   * Output:
   * @returns JSX.Element — SVG 18×18 con stroke currentColor
   */
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={18}
      height={18}
      className="size-[18px] min-h-[18px] min-w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icon === "logs" ? (
        <>
          <circle cx="5" cy="7" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="5" cy="12" r="1.35" fill="currentColor" stroke="none" />
          <circle cx="5" cy="17" r="1.35" fill="currentColor" stroke="none" />
          <path d="M10 7h9" />
          <path d="M10 12h9" />
          <path d="M10 17h6" />
        </>
      ) : (
        <path d={menuIconPath(icon)} />
      )}
    </svg>
  );
}

/**
 * Propósito: Enlace del menú con ícono; versión compacta tipo chip para móvil.
 */
function MenuLink({
  item,
  isActive,
  isCompact = false,
  isCollapsed = false,
}: {
  item: SideMenuItem;
  isActive: boolean;
  isCompact?: boolean;
  isCollapsed?: boolean;
}) {
  /**
   * Output:
   * @returns JSX.Element — Link accesible con estado activo
   */
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        "flex items-center gap-3 text-sm transition",
        isCompact
          ? "shrink-0 rounded-full border px-3.5 py-2"
          : cn("h-10 rounded-lg", isCollapsed ? "mx-auto w-10 justify-center" : "px-3"),
        isActive
          ? isCompact
            ? "border-lime/50 bg-lime/10 text-lime"
            : "bg-lime/12 text-lime font-medium"
          : isCompact
            ? "border-white/10 text-mist hover:text-bone"
            : "text-mist hover:bg-white/5 hover:text-bone",
      )}
    >
      <span className="relative">
        <MenuIcon icon={item.icon} />
        {item.badge && isCollapsed ? (
          <span aria-hidden className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-lime" />
        ) : null}
      </span>
      <span className={cn("whitespace-nowrap", isCollapsed && "sr-only")}>{item.label}</span>
      {item.badge && !isCollapsed ? (
        <span className="ml-auto rounded-full bg-lime px-1.5 text-[10px] font-bold leading-4 text-ink">
          {item.badge > 99 ? "99+" : item.badge}
          <span className="sr-only"> sin leer</span>
        </span>
      ) : null}
    </Link>
  );
}
