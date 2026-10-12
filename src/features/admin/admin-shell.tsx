"use client";

import { useI18n } from "@/core/i18n/provider";
import { cn } from "@/shared/lib/cn";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const ADMIN_HOME_PATH = "/admin";

/**
 * Propósito: Contenido del admin con los avisos del tenant (solo lectura, pendiente,
 * suspendido). El menú lateral lo pinta AppShell para toda la app.
 */
export function AdminShell({
  workspaceLabel,
  suspendedTenants,
  pendingTenantNames,
  isReadOnly,
  children,
}: {
  workspaceLabel: string;
  suspendedTenants: Array<{ organizationName: string; reason: string | null }>;
  pendingTenantNames: string[];
  isReadOnly: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const isDashboard = pathname === ADMIN_HOME_PATH;

  /**
   * Output:
   * @returns JSX.Element — Avisos + contenido
   */
  return (
    <div className="px-4 py-6 sm:px-6">
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
