"use client";

import {
  MAX_COMMISSION_BPS,
  MAX_MONTHLY_FEE,
  STATUS_REASON_MAX_LENGTH,
  TENANT_STATUS_LABELS,
  formatCommissionBps,
  type PlatformTenant,
  type TenantStatus,
} from "@/domain/platform";
import { TenantModulesForm } from "@/features/admin/tenant-modules-editor";
import { ConfirmWithInput } from "@/features/admin/platform/confirm-with-input";
import { StatusPill, type PillTone } from "@/features/admin/platform/platform-ui";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import Link from "next/link";
import { useState } from "react";

type TenantPanelTab = "plan" | "modules" | "status";

const TAB_LABELS: Record<TenantPanelTab, string> = {
  plan: "Plan de cobro",
  modules: "Módulos",
  status: "Estado",
};

const TENANT_STATUS_TONES: Record<TenantStatus, PillTone> = {
  pending: "warning",
  active: "positive",
  suspended: "danger",
};

/**
 * Propósito: Tarjeta de un tenant con métricas y pestañas para plan, módulos y estado. Los
 * pendientes abren en "Estado" para aprobarlos de una vez.
 */
export function TenantAdminCard({ tenant }: { tenant: PlatformTenant }) {
  const [activeTab, setActiveTab] = useState<TenantPanelTab>(
    tenant.status === "pending" ? "status" : "plan",
  );

  /**
   * Output:
   * @returns JSX.Element — Tarjeta del tenant
   */
  return (
    <section className="rounded-[28px] border border-white/8 bg-pitch p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl text-bone">{tenant.name}</h2>
            <StatusPill tone={TENANT_STATUS_TONES[tenant.status]}>
              {TENANT_STATUS_LABELS[tenant.status]}
            </StatusPill>
            {tenant.overdueCount > 0 ? (
              <StatusPill tone="danger">{tenant.overdueCount} vencida(s)</StatusPill>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-mist">
            {tenant.ownerName ?? "Sin dueño"} · {tenant.ownerEmail ?? "—"} · desde{" "}
            {formatDateTime(tenant.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {tenant.ownerEmail ? <ImpersonateTenantButton organizationId={tenant.organizationId} /> : null}
          <Link
            href={`/admin/facturacion?tenant=${tenant.organizationId}`}
            className="text-xs text-lime hover:underline"
          >
            Ver facturas
          </Link>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <TenantMetric label="Inventario" value={`${tenant.establishmentCount} sedes · ${tenant.fieldCount} canchas`} />
        <TenantMetric
          label="30 días"
          value={`${tenant.reservationsLast30Days} reservas · ${formatMoney(tenant.grossLast30Days)}`}
        />
        <TenantMetric
          label="Plan"
          value={`${formatMoney(tenant.monthlyFee)} + ${formatCommissionBps(tenant.commissionBps)}`}
        />
        <TenantMetric label="Por cobrar" value={formatMoney(tenant.outstandingAmount)} />
      </dl>

      <div role="tablist" aria-label={`Configuración de ${tenant.name}`} className="mt-5 flex gap-1 border-b border-white/8">
        {(Object.keys(TAB_LABELS) as TenantPanelTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={
              activeTab === tab
                ? "border-b-2 border-lime px-3 pb-2 text-sm font-semibold text-lime"
                : "border-b-2 border-transparent px-3 pb-2 text-sm text-mist hover:text-bone"
            }
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {activeTab === "plan" ? <TenantBillingForm tenant={tenant} /> : null}
        {activeTab === "modules" ? (
          <TenantModulesForm organizationId={tenant.organizationId} initialModules={tenant.enabledModules} />
        ) : null}
        {activeTab === "status" ? <TenantStatusControls tenant={tenant} /> : null}
      </div>
    </section>
  );
}

/**
 * Propósito: Abre el panel del tenant como su dueño, en solo lectura, para dar soporte.
 */
function ImpersonateTenantButton({ organizationId }: { organizationId: number }) {
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();

  /**
   * Propósito: Cambia la cookie a la sesión de solo lectura y recarga el panel completo.
   */
  async function openTenantView() {
    const response = await runMutation<{ redirectTo: string }>(
      "impersonate",
      `/api/platform/tenants/${organizationId}/impersonate`,
      "POST",
    );
    if (response) {
      window.location.assign(response.redirectTo);
    }
    /**
     * Output:
     * Side effects — Navega al panel del tenant o deja el error visible
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Botón "Ver como"
   */
  return (
    <span className="flex flex-col items-end">
      <button
        type="button"
        disabled={pendingActionKey === "impersonate"}
        onClick={() => void openTenantView()}
        className="text-xs text-lime hover:underline disabled:opacity-60"
      >
        {pendingActionKey === "impersonate" ? "Abriendo…" : "Ver como tenant"}
      </button>
      {errorMessage ? <span className="text-[11px] text-danger">{errorMessage}</span> : null}
    </span>
  );
}

/**
 * Propósito: Par etiqueta/valor de métrica.
 */
function TenantMetric({ label, value }: { label: string; value: string }) {
  /**
   * Output:
   * @returns JSX.Element — Métrica
   */
  return (
    <div className="rounded-2xl bg-white/3 p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">{label}</dt>
      <dd className="mt-1 text-bone">{value}</dd>
    </div>
  );
}

/**
 * Propósito: Edita mensualidad, comisión (en % para el usuario, bps para el backend) y correo.
 */
function TenantBillingForm({ tenant }: { tenant: PlatformTenant }) {
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const [hasJustSaved, setHasJustSaved] = useState(false);

  /**
   * Propósito: Convierte el porcentaje escrito a puntos básicos enteros y guarda.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasJustSaved(false);
    const formData = new FormData(event.currentTarget);
    const commissionPercent = Number(String(formData.get("commissionPercent") ?? "0").replace(",", "."));
    const response = await runMutation("billing", `/api/platform/tenants/${tenant.organizationId}`, "PUT", {
      action: "billing",
      monthlyFee: Number(formData.get("monthlyFee") ?? 0),
      commissionBps: Math.round(commissionPercent * 100),
      billingEmail: String(formData.get("billingEmail") ?? ""),
    });
    setHasJustSaved(response !== null);
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario del plan
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Mensualidad (COP)"
          name="monthlyFee"
          type="number"
          min={0}
          max={MAX_MONTHLY_FEE}
          step={1000}
          required
          defaultValue={tenant.monthlyFee}
        />
        <TextField
          label="Comisión por reserva (%)"
          name="commissionPercent"
          type="number"
          min={0}
          max={MAX_COMMISSION_BPS / 100}
          step={0.01}
          required
          defaultValue={tenant.commissionBps / 100}
          hint="Sobre reservas confirmadas o jugadas del mes"
        />
        <TextField
          label="Correo de cobro"
          name="billingEmail"
          type="email"
          maxLength={160}
          defaultValue={tenant.billingEmail ?? tenant.ownerEmail ?? ""}
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        {hasJustSaved ? <span className="text-xs font-semibold text-lime">Plan guardado</span> : null}
        <Button type="submit" isLoading={pendingActionKey === "billing"} className="px-4 py-2 text-xs">
          Guardar plan
        </Button>
      </div>
      <p className="text-xs text-mist">
        El cambio aplica a las próximas facturas. Las ya emitidas conservan la tarifa con la que se generaron.
      </p>
    </form>
  );
}

/**
 * Propósito: Aprobar (si está pendiente), suspender (con motivo) o reactivar el tenant.
 */
function TenantStatusControls({ tenant }: { tenant: PlatformTenant }) {
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const endpoint = `/api/platform/tenants/${tenant.organizationId}`;

  /**
   * Output:
   * @returns JSX.Element — Controles de estado
   */
  return (
    <div className="space-y-3">
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      {tenant.status === "suspended" ? (
        <>
          <p className="text-sm text-mist">
            Suspendido {tenant.suspendedAt ? formatDateTime(tenant.suspendedAt) : ""}. Motivo:{" "}
            <span className="text-bone">{tenant.suspendedReason ?? "—"}</span>
          </p>
          <Button
            variant="secondary"
            isLoading={pendingActionKey === "reactivate"}
            onClick={() => runMutation("reactivate", endpoint, "PUT", { action: "reactivate" })}
            className="px-4 py-2 text-xs"
          >
            Reactivar tenant
          </Button>
        </>
      ) : (
        <>
          {tenant.status === "pending" ? (
            <div className="space-y-2 rounded-2xl border border-clay/30 bg-clay/10 p-4">
              <p className="text-sm text-bone">
                Registrado {formatDateTime(tenant.createdAt)}. Sus sedes no salen al público hasta
                aprobarlo; al hacerlo le avisamos por correo.
              </p>
              <Button
                isLoading={pendingActionKey === "approve"}
                onClick={() => runMutation("approve", endpoint, "PUT", { action: "approve" })}
                className="px-4 py-2 text-xs"
              >
                Aprobar tenant
              </Button>
            </div>
          ) : (
            <p className="text-sm text-mist">
              Aprobado {tenant.approvedAt ? formatDateTime(tenant.approvedAt) : "—"}.
            </p>
          )}
          <p className="text-sm text-mist">
            Al suspender, sus sedes dejan de mostrarse al público, no recibe reservas nuevas y su staff pierde
            el panel. El dueño sigue viendo sus facturas. El motivo se le muestra en su panel.
          </p>
          <ConfirmWithInput
            triggerLabel="Suspender tenant"
            inputLabel="Motivo de la suspensión"
            placeholder="Ej. Factura de septiembre vencida"
            confirmLabel="Confirmar suspensión"
            maxLength={STATUS_REASON_MAX_LENGTH}
            isPending={pendingActionKey === "suspend"}
            onConfirm={async (reason) =>
              (await runMutation("suspend", endpoint, "PUT", { action: "suspend", reason })) !== null
            }
          />
        </>
      )}
    </div>
  );
}
