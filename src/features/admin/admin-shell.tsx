"use client";

import { useI18n } from "@/core/i18n/provider";
import type { TenantModule } from "@/domain/tenant-modules";
import { cn } from "@/shared/lib/cn";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const ADMIN_HOME_PATH = "/admin";

export type AdminMenuIcon =
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
  | "payments";

export interface AdminMenuItem {
  href: string;
  label: string;
  icon: AdminMenuIcon;
}

const MENU_ICON_PATHS: Record<AdminMenuIcon, string> = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  establishments: "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
  fields: "M3 5h18v14H3V5Zm9 0v14M3 9h3v6H3m18-6h-3v6h3M12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
  reservations: "M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8 2.5 2.5L16 10",
  overview: "M4 19V9m5 10V5m5 14v-7m5 7V8M3 21h18",
  tenants: "M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5",
  billing: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h3",
  users: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74",
  reports: "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Zm0 0v5h5M9 17v-3m3 3v-6m3 6v-2",
  audit: "M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5",
  logs: "M10 7h9M10 12h9M10 17h6",
  emails: "M4 6h16v12H4V6Zm0 0 8 7 8-7",
  team: "M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1m7-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9-1v6m3-3h-6",
  payments: "M4 9h16v10H4V9Zm3-4h10l2 4H5l2-4Zm5 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z",
};

const FALLBACK_MENU_ICON_PATH = "M4 6h16M4 12h16M4 18h10";

/**
 * Propósito: Resuelve el trazo del ícono del menú. Si falta la clave, usa un listado
 * genérico para que el ítem nunca quede en blanco.
 */
function menuIconPath(icon: AdminMenuIcon): string {
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
function isMenuItemActive(href: string, pathname: string): boolean {
  /**
   * Output:
   * @returns boolean — Ítem activo
   */
  return href === ADMIN_HOME_PATH ? pathname === href : pathname.startsWith(href);
}

/**
 * Propósito: Marco del admin con menú lateral izquierdo (desktop) y barra horizontal (móvil).
 * Recibe los ítems ya filtrados en servidor según los módulos habilitados del tenant.
 */
export function AdminShell({
  workspaceLabel,
  moduleMenuItems,
  accountMenuTitle,
  accountMenuItems,
  suspendedTenants,
  pendingTenantNames,
  isReadOnly,
  children,
}: {
  workspaceLabel: string;
  moduleMenuItems: AdminMenuItem[];
  accountMenuTitle: string;
  accountMenuItems: AdminMenuItem[];
  suspendedTenants: Array<{ organizationName: string; reason: string | null }>;
  pendingTenantNames: string[];
  isReadOnly: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const isDashboard = pathname === ADMIN_HOME_PATH;
  const allMenuItems = [...moduleMenuItems, ...accountMenuItems];

  /**
   * Output:
   * @returns JSX.Element — Sidebar + contenido
   */
  return (
    <div className="mx-auto flex max-w-[1840px] gap-6 px-4 py-6 sm:px-6">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-6 space-y-6 rounded-[28px] border border-white/8 bg-pitch/60 p-4">
          <div className="px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-lime">
              {t("admin.panel")}
            </p>
            <p className="mt-1 truncate font-display text-lg text-bone" title={workspaceLabel}>
              {workspaceLabel}
            </p>
          </div>

          <MenuSection title={t("admin.modules")} items={moduleMenuItems} pathname={pathname} />
          <MenuSection title={accountMenuTitle} items={accountMenuItems} pathname={pathname} />
          {allMenuItems.length === 0 ? (
            <p className="px-2 text-xs leading-5 text-mist">{t("admin.noModules")}</p>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <nav
          aria-label={t("admin.menuLabel")}
          className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
        >
          {allMenuItems.map((item) => (
            <MenuLink
              key={item.href}
              item={item}
              isActive={isMenuItemActive(item.href, pathname)}
              isCompact
            />
          ))}
        </nav>
        {isReadOnly ? <ReadOnlyBanner workspaceLabel={workspaceLabel} /> : null}
        {pendingTenantNames.map((tenantName) => (
          <div
            key={tenantName}
            role="status"
            className="mb-4 rounded-2xl border border-lime/30 bg-lime/8 px-4 py-3 text-sm text-bone"
          >
            <strong className="font-semibold">{t("admin.pendingApproval", { name: tenantName })}</strong>{" "}
            {t("admin.pendingApprovalBody")}
          </div>
        ))}
        {suspendedTenants.map((tenant) => (
          <div
            key={tenant.organizationName}
            role="alert"
            className="mb-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-bone"
          >
            <strong className="font-semibold">
              {t("admin.suspended", { name: tenant.organizationName })}
            </strong>{" "}
            {t("admin.suspendedBody")}
            {tenant.reason ? <> {t("admin.reason", { reason: tenant.reason })}</> : null}
          </div>
        ))}
        <div className={cn(!isDashboard && "mx-auto max-w-6xl py-4")}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Propósito: Aviso fijo de la vista "ver como tenant" con el botón para volver al panel del
 * super admin.
 */
function ReadOnlyBanner({ workspaceLabel }: { workspaceLabel: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [isLeaving, setIsLeaving] = useState(false);

  /**
   * Propósito: Restaura la sesión del super admin.
   */
  async function leaveImpersonation() {
    setIsLeaving(true);
    const response = await fetch("/api/auth/impersonation/exit", { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { redirectTo?: string };
    router.replace(payload.redirectTo ?? "/login");
    router.refresh();
    /**
     * Output:
     * Side effects — Vuelve a la lista de tenants del super admin
     */
  }

  /**
   * Propósito: Pide confirmación antes de dejar la vista de solo lectura.
   */
  function requestExit() {
    askConfirmation({
      title: t("admin.impersonationTitle"),
      description: t("admin.impersonationDescription"),
      confirmLabel: t("admin.impersonationConfirm"),
      tone: "primary",
      run: leaveImpersonation,
    });
    /**
     * Output:
     * Side effects — Abre el modal; la vista de solo lectura sigue hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Banner de solo lectura
   */
  return (
    <div
      role="status"
      className="sticky top-2 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-flare/50 bg-flare/15 px-4 py-3 text-sm text-bone backdrop-blur"
    >
      {confirmationDialog}
      <span>
        <strong className="font-semibold">{t("admin.viewingAs", { name: workspaceLabel })}</strong>{" "}
        {t("admin.readOnlyHint")}
      </span>
      <button
        type="button"
        disabled={isLeaving}
        onClick={requestExit}
        className="rounded-full bg-bone px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-white disabled:opacity-60"
      >
        {isLeaving ? t("admin.leaving") : t("admin.exit")}
      </button>
    </div>
  );
}

/**
 * Propósito: Grupo titulado de enlaces del sidebar.
 */
function MenuSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: AdminMenuItem[];
  pathname: string;
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
    <nav aria-label={title} className="space-y-1">
      <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/70">
        {title}
      </p>
      {items.map((item) => (
        <MenuLink key={item.href} item={item} isActive={isMenuItemActive(item.href, pathname)} />
      ))}
    </nav>
  );
}

/**
 * Propósito: Glifo del ítem del sidebar. Logs usa puntos rellenos + líneas: el path de
 * documento con arcos no se pintaba a 18px con fill none.
 */
function MenuIcon({ icon }: { icon: AdminMenuIcon }) {
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
}: {
  item: AdminMenuItem;
  isActive: boolean;
  isCompact?: boolean;
}) {
  /**
   * Output:
   * @returns JSX.Element — Link accesible con estado activo
   */
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 text-sm transition",
        isCompact
          ? "shrink-0 rounded-full border px-3.5 py-2"
          : "rounded-xl px-3 py-2.5",
        isActive
          ? isCompact
            ? "border-lime/50 bg-lime/10 text-lime"
            : "bg-lime text-ink font-semibold"
          : isCompact
            ? "border-white/10 text-mist hover:text-bone"
            : "text-mist hover:bg-white/5 hover:text-bone",
      )}
    >
      <MenuIcon icon={item.icon} />
      <span className="whitespace-nowrap">{item.label}</span>
    </Link>
  );
}
