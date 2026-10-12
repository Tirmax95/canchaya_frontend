"use client";

import { useI18n } from "@/core/i18n/provider";
import { TENANT_STATUS_KEYS, translateMappedLabel } from "@/core/i18n/label-keys";
import type { PlatformTenant } from "@/domain/platform";
import { AdminToggleSwitch, PanelSection, StatusPill } from "@/features/admin/platform/platform-ui";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { Alert } from "@/shared/ui/alert";

/**
 * Propósito: Lista de tenants para que el super admin encienda el cobro en línea uno a uno.
 * Las llaves de la pasarela son globales; sin este flag el jugador no ve medios de pago.
 */
export function TenantOnlinePaymentsPanel({ tenants }: { tenants: PlatformTenant[] }) {
  const { t } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();

  /**
   * Output:
   * @returns JSX.Element — Lista con switch por tenant
   */
  return (
    <PanelSection title={t("platform.onlinePaymentsTitle")}>
      <p className="mb-4 text-sm text-mist">{t("platform.onlinePaymentsPanelIntro")}</p>
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      {tenants.length === 0 ? (
        <p className="text-sm text-mist">{t("platform.tenantsEmptyTitle")}</p>
      ) : (
        <ul className="divide-y divide-white/5">
          {tenants.map((tenant) => {
            const actionKey = `online-payments:${tenant.organizationId}`;
            return (
              <li
                key={tenant.organizationId}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-bone">{tenant.name}</p>
                    <StatusPill tone={tenant.onlinePaymentsEnabled ? "positive" : "neutral"}>
                      {tenant.onlinePaymentsEnabled ? t("common.on") : t("common.off")}
                    </StatusPill>
                    <span className="text-xs text-mist">
                      {translateMappedLabel(t, TENANT_STATUS_KEYS, tenant.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-mist">
                    {tenant.ownerEmail ?? t("common.noOwner")} ·{" "}
                    {t("platform.seatsCount", { count: tenant.establishmentCount })}
                  </p>
                </div>
                <AdminToggleSwitch
                  label={t("platform.onlinePaymentsToggleAria", { name: tenant.name })}
                  isOn={tenant.onlinePaymentsEnabled}
                  disabled={pendingActionKey !== null}
                  onToggle={(isEnabled) =>
                    void runMutation(actionKey, `/api/platform/tenants/${tenant.organizationId}`, "PUT", {
                      action: "online_payments",
                      isEnabled,
                    })
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </PanelSection>
  );
}
