import "server-only";
import {
  TENANT_BILLING_PATH,
  TENANT_NEWS_PATH,
  TENANT_TEAM_PATH,
  getAdminAccess,
  type AdminAccess,
} from "@/application/admin-access";
import { isStaff } from "@/core/auth/roles";
import type { SessionUser } from "@/domain/user";
import { translateTenantModuleLabel } from "@/core/i18n/label-keys";
import type { TranslateFn } from "@/core/i18n/translate";
import {
  TENANT_MODULE_DEFINITIONS,
  modulesInSection,
  type TenantModule,
} from "@/domain/tenant-modules";
import type { SideMenuIcon, SideMenuItem } from "@/features/navigation/side-menu";

export interface SideMenuSection {
  title: string;
  items: SideMenuItem[];
}

export interface SideMenuModel {
  workspaceLabel: string;
  workspaceEyebrow: string;
  sections: SideMenuSection[];
}

/** Enlace público de Explorar que repite un módulo del panel; con el módulo activo se oculta. */
const EXPLORE_ITEMS_COVERED_BY_MODULE: Partial<Record<string, TenantModule>> = {
  "/eventos": "events",
  "/establecimientos": "establishments",
  "/reservas": "reservations",
};

/** Partidos, retos y equipos: el super admin los habilita por tenant para su staff. */
const EXPLORE_MODULE_BY_HREF: Partial<Record<string, TenantModule>> = {
  "/partidos": "matches",
  "/retos": "challenges",
  "/equipos": "teams",
};

/**
 * Propósito: Enlaces generales de la app. Un jugador los ve todos. Para el staff
 * (`enabledModules` definido) Partidos/Retos/Equipos dependen de sus módulos, y Sedes,
 * Reservas y Eventos se ocultan si ya los tiene como módulo del panel: cada sección una vez.
 */
function buildExploreItems(t: TranslateFn, enabledModules?: readonly TenantModule[]): SideMenuItem[] {
  const items: SideMenuItem[] = [
    { href: "/partidos", label: t("nav.matches"), icon: "matches" },
    { href: "/retos", label: t("nav.challenges"), icon: "challenges" },
    { href: "/equipos", label: t("nav.teams"), icon: "teams" },
    { href: "/eventos", label: t("nav.events"), icon: "events" },
    { href: "/establecimientos", label: t("nav.venues"), icon: "venues" },
    { href: "/reservas", label: t("nav.bookings"), icon: "bookings" },
  ];
  if (!enabledModules) {
    /**
     * Output:
     * @returns SideMenuItem[] — Jugador: todos los enlaces
     */
    return items;
  }
  /**
   * Output:
   * @returns SideMenuItem[] — Staff: solo módulos habilitados y sin duplicar el panel
   */
  return items.filter((item) => {
    const requiredModule = EXPLORE_MODULE_BY_HREF[item.href];
    if (requiredModule) {
      return enabledModules.includes(requiredModule);
    }
    const coveringModule = EXPLORE_ITEMS_COVERED_BY_MODULE[item.href];
    return !coveringModule || !enabledModules.includes(coveringModule);
  });
}

/**
 * Propósito: Menú de plataforma del super admin.
 */
function buildSuperAdminItems(t: TranslateFn): SideMenuItem[] {
  /**
   * Output:
   * @returns SideMenuItem[] — Enlaces de plataforma
   */
  return [
    { href: "/admin/plataforma", label: t("admin.overview"), icon: "overview" },
    { href: "/admin/tenants", label: t("admin.tenants"), icon: "tenants" },
    { href: "/admin/facturacion", label: t("admin.billing"), icon: "billing" },
    { href: "/admin/pagos", label: t("admin.payments"), icon: "payments" },
    { href: "/admin/reglas-reservas", label: t("admin.bookingRules"), icon: "reservations" },
    { href: "/admin/usuarios", label: t("admin.users"), icon: "users" },
    { href: "/admin/reportes", label: t("admin.reports"), icon: "reports" },
    { href: "/admin/correos", label: t("admin.emails"), icon: "emails" },
    { href: "/admin/auditoria", label: t("admin.audit"), icon: "audit" },
    { href: "/admin/logs", label: t("admin.logs"), icon: "logs" },
  ];
}

/**
 * Propósito: Acceso del staff sin romper la página si el backend no responde: sin módulos.
 */
async function loadStaffAccess(): Promise<AdminAccess | null> {
  try {
    /**
     * Output:
     * @returns AdminAccess — Módulos habilitados del tenant (deduplicado con `cache`)
     */
    return await getAdminAccess();
  } catch {
    /**
     * Output:
     * @returns null — Menú solo con enlaces generales
     */
    return null;
  }
}

/**
 * Propósito: Arma el menú lateral único de la app. Los módulos de sede salen solo de los que
 * el super admin habilitó para el tenant; cada página y el backend vuelven a validar el acceso.
 */
export async function buildSideMenu(session: SessionUser, t: TranslateFn): Promise<SideMenuModel> {
  const profileItem: SideMenuItem = { href: "/perfil", label: t("nav.profile"), icon: "profile" };
  const messagesItem: SideMenuItem = { href: "/mensajes", label: t("nav.messages"), icon: "messages" };
  const userLabel = session.fullName ?? session.email;
  const access = isStaff(session) ? await loadStaffAccess() : null;

  if (!access) {
    const exploreSection: SideMenuSection = { title: t("nav.explore"), items: buildExploreItems(t) };
    /**
     * Output:
     * @returns SideMenuModel — Jugador (o staff sin acceso resuelto)
     */
    return {
      workspaceEyebrow: t("nav.menuLabel"),
      workspaceLabel: userLabel,
      sections: [exploreSection, { title: t("admin.account"), items: [messagesItem, profileItem] }],
    };
  }

  const moduleItems: SideMenuItem[] = modulesInSection(access.enabledModules, "panel").map(
    (tenantModule) => ({
      href: TENANT_MODULE_DEFINITIONS[tenantModule].href,
      label: translateTenantModuleLabel(t, tenantModule),
      icon: tenantModule as SideMenuIcon,
    }),
  );
  const sections: SideMenuSection[] = [{ title: t("admin.modules"), items: moduleItems }];
  if (access.isSuperAdmin) {
    sections.push({ title: t("admin.platform"), items: buildSuperAdminItems(t) });
  }
  sections.push({
    title: t("nav.explore"),
    items: buildExploreItems(t, access.enabledModules),
  });
  const accountItems: SideMenuItem[] = [];
  if (access.isTenantOwner && access.enabledModules.includes("news")) {
    accountItems.push({ href: TENANT_NEWS_PATH, label: t("admin.news"), icon: "news" });
  }
  if (access.isTenantOwner && access.enabledModules.includes("billing")) {
    accountItems.push({ href: TENANT_BILLING_PATH, label: t("admin.myBilling"), icon: "billing" });
  }
  if (access.isTenantOwner && access.enabledModules.includes("staff")) {
    accountItems.push({ href: TENANT_TEAM_PATH, label: t("admin.team"), icon: "team" });
  }
  if (!access.enabledModules.includes("messages")) {
    // Sin el módulo de la sede igual conversa como jugador (sus reservas y equipos).
    accountItems.push(messagesItem);
  }
  accountItems.push(profileItem);
  sections.push({ title: t("admin.account"), items: accountItems });

  /**
   * Output:
   * @returns SideMenuModel — Módulos del tenant + plataforma/cuenta + navegación general
   */
  return {
    workspaceEyebrow: t("admin.panel"),
    workspaceLabel: access.workspaceLabel,
    sections: sections.filter((section) => section.items.length > 0),
  };
}
