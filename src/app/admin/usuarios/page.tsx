import { requireSuperAdminAccess } from "@/application/admin-access";
import { requireSession } from "@/core/auth/session";
import { listPlatformUsers } from "@/data/platform.repository";
import {
  USER_ROLE_FILTERS,
  USER_ROLE_LABELS,
  type UserAccountStatus,
  type UserRoleFilter,
} from "@/domain/platform";
import { DataTable, PanelSection, StatusPill } from "@/features/admin/platform/platform-ui";
import { ResetTwoFactorAction, UserStatusAction } from "@/features/admin/platform/user-status-action";
import { formatDateTime } from "@/shared/lib/datetime";
import { buttonClassName } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin · Usuarios" };

const USERS_PATH = "/admin/usuarios";
const USERS_PAGE_SIZE = 25;
const MAX_SEARCH_LENGTH = 80;

interface UserFilters {
  q?: string;
  estado?: UserAccountStatus;
  rol?: UserRoleFilter;
  pagina: number;
}

/**
 * Propósito: Normaliza los filtros de la URL (cualquier valor no reconocido se ignora).
 */
function parseUserFilters(raw: { q?: string; estado?: string; rol?: string; pagina?: string }): UserFilters {
  const page = Number(raw.pagina);
  /**
   * Output:
   * @returns UserFilters — Filtros válidos
   */
  return {
    q: raw.q?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined,
    estado: raw.estado === "active" || raw.estado === "blocked" ? raw.estado : undefined,
    rol: USER_ROLE_FILTERS.includes(raw.rol as UserRoleFilter) ? (raw.rol as UserRoleFilter) : undefined,
    pagina: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/**
 * Propósito: Href con filtros y página.
 */
function buildUsersHref(filters: UserFilters, page: number): string {
  const searchParams = new URLSearchParams();
  if (filters.q) searchParams.set("q", filters.q);
  if (filters.estado) searchParams.set("estado", filters.estado);
  if (filters.rol) searchParams.set("rol", filters.rol);
  if (page > 1) searchParams.set("pagina", String(page));
  const query = searchParams.toString();
  /**
   * Output:
   * @returns string — Ruta con query
   */
  return query ? `${USERS_PATH}?${query}` : USERS_PATH;
}

/**
 * Propósito: Directorio de todos los usuarios con bloqueo/desbloqueo.
 */
export default async function PlatformUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; rol?: string; pagina?: string }>;
}) {
  const [, session, rawFilters] = await Promise.all([
    requireSuperAdminAccess(),
    requireSession(),
    searchParams,
  ]);
  const filters = parseUserFilters(rawFilters);
  const userPage = await listPlatformUsers({
    search: filters.q,
    status: filters.estado,
    role: filters.rol,
    page: filters.pagina,
    pageSize: USERS_PAGE_SIZE,
  });
  const pageCount = Math.max(1, Math.ceil(userPage.total / USERS_PAGE_SIZE));

  /**
   * Output:
   * @returns JSX.Element — Buscador + tabla paginada
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Plataforma"
        title="Usuarios"
        description="Jugadores, dueños y staff de toda la plataforma. Un usuario bloqueado pierde sus sesiones y no puede volver a entrar."
      />

      <PanelSection title={`${userPage.total} usuarios`}>
        <form method="get" action={USERS_PATH} className="mb-4 grid gap-2 sm:grid-cols-[1fr_160px_180px_auto]">
          <input
            name="q"
            defaultValue={filters.q}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="Buscar por correo o nombre"
            aria-label="Buscar usuarios"
            className="rounded-2xl border border-white/10 bg-ink/40 px-4 py-2.5 text-sm text-bone outline-none focus:border-lime/70"
          />
          <select
            name="estado"
            defaultValue={filters.estado ?? ""}
            aria-label="Estado"
            className="rounded-2xl border border-white/10 bg-ink/40 px-3 py-2.5 text-sm text-bone"
          >
            <option value="" className="bg-ink">Todos los estados</option>
            <option value="active" className="bg-ink">Activos</option>
            <option value="blocked" className="bg-ink">Bloqueados</option>
          </select>
          <select
            name="rol"
            defaultValue={filters.rol ?? ""}
            aria-label="Rol"
            className="rounded-2xl border border-white/10 bg-ink/40 px-3 py-2.5 text-sm text-bone"
          >
            <option value="" className="bg-ink">Todos los roles</option>
            {USER_ROLE_FILTERS.map((role) => (
              <option key={role} value={role} className="bg-ink">
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button type="submit" className={buttonClassName("secondary", "py-2.5")}>
            Filtrar
          </button>
        </form>

        {userPage.users.length === 0 ? (
          <EmptyState title="Sin resultados" description="Ningún usuario coincide con los filtros." />
        ) : (
          <DataTable headers={["Usuario", "Roles y tenants", "Actividad", "Estado", ""]}>
            {userPage.users.map((user) => (
              <tr key={user.userId} className="align-top">
                <td className="px-3 py-3">
                  <p className="text-bone">{user.fullName ?? "Sin nombre"}</p>
                  <p className="text-xs text-mist">{user.email}</p>
                  {user.phone ? <p className="text-xs text-mist">{user.phone}</p> : null}
                </td>
                <td className="px-3 py-3 text-xs text-mist">
                  <p className="text-bone">
                    {user.roles.map((role) => USER_ROLE_LABELS[role] ?? role).join(", ") || "Sin rol"}
                  </p>
                  {user.organizations.map((organization) => (
                    <p key={organization.organizationId}>
                      {organization.name} ({organization.role === "owner" ? "dueño" : "manager"})
                    </p>
                  ))}
                </td>
                <td className="px-3 py-3 text-xs text-mist">
                  <p>Alta {formatDateTime(user.createdAt)}</p>
                  <p>{user.lastSeenAt ? `Visto ${formatDateTime(user.lastSeenAt)}` : "Sin sesiones activas"}</p>
                  <p>{user.reservationCount} reservas</p>
                </td>
                <td className="px-3 py-3">
                  <StatusPill tone={user.status === "blocked" ? "danger" : "positive"}>
                    {user.status === "blocked" ? "Bloqueado" : "Activo"}
                  </StatusPill>
                  {user.blockedReason ? (
                    <p className="mt-1 max-w-[200px] text-[11px] text-mist">Motivo: {user.blockedReason}</p>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-end gap-2">
                    {user.roles.includes("admin") ? null : (
                      <UserStatusAction userId={user.userId} status={user.status} />
                    )}
                    {user.userId === session.id ? null : <ResetTwoFactorAction userId={user.userId} />}
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        {pageCount > 1 ? (
          <nav aria-label="Paginación" className="mt-4 flex items-center justify-between text-sm text-mist">
            <span>
              Página {filters.pagina} de {pageCount}
            </span>
            <div className="flex gap-2">
              {filters.pagina > 1 ? (
                <Link href={buildUsersHref(filters, filters.pagina - 1)} className="text-lime hover:underline">
                  Anterior
                </Link>
              ) : null}
              {filters.pagina < pageCount ? (
                <Link href={buildUsersHref(filters, filters.pagina + 1)} className="text-lime hover:underline">
                  Siguiente
                </Link>
              ) : null}
            </div>
          </nav>
        ) : null}
      </PanelSection>
    </div>
  );
}
