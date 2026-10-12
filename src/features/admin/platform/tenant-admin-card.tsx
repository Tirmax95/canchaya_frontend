"use client";

import { useI18n } from "@/core/i18n/provider";
import { TENANT_STATUS_KEYS, translateMappedLabel } from "@/core/i18n/label-keys";
import {
  MAX_COMMISSION_BPS,
  MAX_MONTHLY_FEE,
  STATUS_REASON_MAX_LENGTH,
  formatCommissionBps,
  type PlatformTenant,
  type TenantStatus,
} from "@/domain/platform";
import { TenantModulesForm } from "@/features/admin/tenant-modules-editor";
import { ConfirmWithInput } from "@/features/admin/platform/confirm-with-input";
import { AdminToggleSwitch, StatusPill, type PillTone } from "@/features/admin/platform/platform-ui";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { TextField } from "@/shared/ui/input";
import Link from "next/link";
import { useState } from "react";

type TenantPanelTab = "plan" | "payments" | "modules" | "status";

const TAB_LABEL_KEYS = {
  plan: "platform.tabPlan",
  payments: "platform.tabPayments",
  modules: "platform.tabModules",
  status: "platform.tabStatus",
} as const;

const TENANT_STATUS_TONES: Record<TenantStatus, PillTone> = {
  pending: "warning",
  active: "positive",
  suspended: "danger",
};

/**
 * Propósito: Tarjeta de un tenant con métricas y pestañas para plan, cobro en línea, módulos
 * y estado. Los pendientes abren en "Estado" para aprobarlos de una vez.
 */
export function TenantAdminCard({ tenant }: { tenant: PlatformTenant }) {
  const { t, intlLocale } = useI18n();
  const consultLabel = t("common.consult");
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
              {translateMappedLabel(t, TENANT_STATUS_KEYS, tenant.status)}
            </StatusPill>
            {tenant.overdueCount > 0 ? (
              <StatusPill tone="danger">
                {t("platform.overdueCountPill", { count: tenant.overdueCount })}
              </StatusPill>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-mist">
            {t("platform.ownerSince", {
              name: tenant.ownerName ?? t("common.noOwner"),
              email: tenant.ownerEmail ?? t("common.none"),
              date: formatDateTime(tenant.createdAt, intlLocale),
            })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {tenant.ownerEmail ? <ImpersonateTenantButton organizationId={tenant.organizationId} /> : null}
          <Link
            href={`/admin/facturacion?tenant=${tenant.organizationId}`}
            className="text-xs text-lime hover:underline"
          >
            {t("platform.seeInvoicesLink")}
          </Link>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <TenantMetric
          label={t("platform.inventory")}
          value={t("platform.inventoryValue", {
            venues: tenant.establishmentCount,
            courts: tenant.fieldCount,
          })}
        />
        <TenantMetric
          label={t("platform.last30")}
          value={t("platform.last30Metrics", {
            count: tenant.reservationsLast30Days,
            amount: formatMoney(tenant.grossLast30Days, intlLocale, consultLabel),
          })}
        />
        <TenantMetric
          label={t("platform.plan")}
          value={`${formatMoney(tenant.monthlyFee, intlLocale, consultLabel)} + ${formatCommissionBps(tenant.commissionBps, intlLocale)}`}
        />
        <TenantMetric
          label={t("platform.outstanding")}
          value={formatMoney(tenant.outstandingAmount, intlLocale, consultLabel)}
        />
      </dl>

      <div
        role="tablist"
        aria-label={t("platform.tenantConfigAria", { name: tenant.name })}
        className="mt-5 flex gap-1 border-b border-white/8"
      >
        {(Object.keys(TAB_LABEL_KEYS) as TenantPanelTab[]).map((tab) => (
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
            {t(TAB_LABEL_KEYS[tab])}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {activeTab === "plan" ? <TenantBillingForm tenant={tenant} /> : null}
        {activeTab === "payments" ? <TenantOnlinePaymentsControls tenant={tenant} /> : null}
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
  const { t } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const { askConfirmation, confirmationDialog } = useConfirmAction();

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
   * Propósito: Pide confirmación antes de entrar al panel del negocio en solo lectura.
   */
  function requestImpersonation() {
    askConfirmation({
      title: t("platform.impersonateTitle"),
      description: t("platform.impersonateDescription"),
      confirmLabel: t("platform.impersonateConfirm"),
      tone: "primary",
      run: openTenantView,
    });
    /**
     * Output:
     * Side effects — Abre el modal; la sesión no cambia hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Botón "Ver como"
   */
  return (
    <span className="flex flex-col items-end">
      {confirmationDialog}
      <button
        type="button"
        disabled={pendingActionKey === "impersonate"}
        onClick={requestImpersonation}
        className="text-xs text-lime hover:underline disabled:opacity-60"
      >
        {pendingActionKey === "impersonate" ? t("platform.opening") : t("platform.impersonateButton")}
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
  const { t } = useI18n();
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
          label={t("platform.monthlyFee")}
          name="monthlyFee"
          type="number"
          min={0}
          max={MAX_MONTHLY_FEE}
          step={1000}
          required
          defaultValue={tenant.monthlyFee}
        />
        <TextField
          label={t("platform.commission")}
          name="commissionPercent"
          type="number"
          min={0}
          max={MAX_COMMISSION_BPS / 100}
          step={0.01}
          required
          defaultValue={tenant.commissionBps / 100}
          hint={t("platform.commissionHint")}
        />
        <TextField
          label={t("platform.billingEmail")}
          name="billingEmail"
          type="email"
          maxLength={160}
          defaultValue={tenant.billingEmail ?? tenant.ownerEmail ?? ""}
        />
      </div>
      <div className="flex items-center justify-end gap-3">
        {hasJustSaved ? (
          <span className="text-xs font-semibold text-lime">{t("platform.planSaved")}</span>
        ) : null}
        <Button type="submit" isLoading={pendingActionKey === "billing"} className="px-4 py-2 text-xs">
          {t("platform.savePlan")}
        </Button>
      </div>
      <p className="text-xs text-mist">{t("platform.billingFormHint")}</p>
    </form>
  );
}

/**
 * Propósito: Enciende el cobro en línea de reservas de este tenant. Las llaves viven en
 * /admin/pagos; aquí solo se decide si este negocio las usa.
 */
function TenantOnlinePaymentsControls({ tenant }: { tenant: PlatformTenant }) {
  const { t } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();

  /**
   * Output:
   * @returns JSX.Element — Switch de cobro en línea
   */
  return (
    <div className="space-y-3">
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-ink/30 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-bone">{t("platform.onlinePaymentsReservationLabel")}</p>
          <p className="mt-1 text-xs text-mist">
            {tenant.onlinePaymentsEnabled ? t("platform.paymentsOn") : t("platform.paymentsOff")}
          </p>
        </div>
        <AdminToggleSwitch
          label={t("platform.onlinePaymentsToggleAria", { name: tenant.name })}
          isOn={tenant.onlinePaymentsEnabled}
          disabled={pendingActionKey !== null}
          onToggle={(isEnabled) =>
            void runMutation(
              "online_payments",
              `/api/platform/tenants/${tenant.organizationId}`,
              "PUT",
              { action: "online_payments", isEnabled },
            )
          }
        />
      </div>
    </div>
  );
}

/**
 * Propósito: Aprobar (si está pendiente), suspender (con motivo) o reactivar el tenant.
 */
function TenantStatusControls({ tenant }: { tenant: PlatformTenant }) {
  const { t, intlLocale } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const endpoint = `/api/platform/tenants/${tenant.organizationId}`;
  const tenantName = tenant.name.trim() || t("platform.tenantFallbackName");

  /**
   * Propósito: Pide confirmación antes de aprobar un negocio y publicar sus sedes.
   */
  function requestApproval() {
    askConfirmation({
      title: t("platform.approveTitle", { name: tenantName }),
      description: t("platform.approveDescription"),
      confirmLabel: t("platform.approveConfirm"),
      tone: "primary",
      run: async () => {
        await runMutation("approve", endpoint, "PUT", { action: "approve" });
      },
    });
    /**
     * Output:
     * Side effects — Abre el modal; el negocio sigue pendiente hasta aceptar
     */
  }

  /**
   * Propósito: Pide confirmación antes de reactivar un negocio suspendido.
   */
  function requestReactivation() {
    askConfirmation({
      title: t("platform.reactivateTitle", { name: tenantName }),
      description: t("platform.reactivateDescription"),
      confirmLabel: t("platform.reactivateConfirm"),
      tone: "primary",
      run: async () => {
        await runMutation("reactivate", endpoint, "PUT", { action: "reactivate" });
      },
    });
    /**
     * Output:
     * Side effects — Abre el modal; el negocio sigue suspendido hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Controles de estado
   */
  return (
    <div className="space-y-3">
      {confirmationDialog}
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      {tenant.status === "suspended" ? (
        <>
          <p className="text-sm text-mist">
            {t("platform.suspendedSince", {
              date: tenant.suspendedAt ? formatDateTime(tenant.suspendedAt, intlLocale) : t("common.none"),
            })}{" "}
            <span className="text-bone">{tenant.suspendedReason ?? t("common.none")}</span>
          </p>
          <Button
            variant="secondary"
            isLoading={pendingActionKey === "reactivate"}
            onClick={requestReactivation}
            className="px-4 py-2 text-xs"
          >
            {t("platform.reactivateTenantButton")}
          </Button>
        </>
      ) : (
        <>
          {tenant.status === "pending" ? (
            <div className="space-y-2 rounded-2xl border border-clay/30 bg-clay/10 p-4">
              <p className="text-sm text-bone">
                {t("platform.pendingApprovalHint", {
                  date: formatDateTime(tenant.createdAt, intlLocale),
                })}
              </p>
              <Button
                isLoading={pendingActionKey === "approve"}
                onClick={requestApproval}
                className="px-4 py-2 text-xs"
              >
                {t("platform.approveTenantButton")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-mist">
              {t("platform.approvedAt", {
                date: tenant.approvedAt ? formatDateTime(tenant.approvedAt, intlLocale) : t("common.none"),
              })}
            </p>
          )}
          <p className="text-sm text-mist">
            {t("platform.suspendConsequences")}
          </p>
          <ConfirmWithInput
            triggerLabel={t("platform.suspendTrigger")}
            inputLabel={t("platform.suspendReason")}
            placeholder={t("platform.suspendPlaceholder")}
            confirmLabel={t("platform.suspendConfirm")}
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
