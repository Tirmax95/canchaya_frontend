"use client";

import type {
  AdminPaymentGateway,
  AdminPendingIntent,
} from "@/domain/payments";
import { PAYMENT_METHOD_ICON } from "@/domain/payments";
import { useI18n } from "@/core/i18n/provider";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { AdminToggleSwitch, PanelSection, StatusPill } from "@/features/admin/platform/platform-ui";
import { formatMoney } from "@/shared/lib/money";
import { cn } from "@/shared/lib/cn";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useState } from "react";

/**
 * Propósito: Panel del super admin: encender/apagar pasarelas y métodos, y cargar llaves
 * sin exponer las que ya están guardadas.
 */
export function PaymentGatewaysPanel({
  gateways,
  pendingIntents,
}: {
  gateways: AdminPaymentGateway[];
  pendingIntents: AdminPendingIntent[];
}) {
  const { t } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();

  /**
   * Output:
   * @returns JSX.Element — Catálogo + transferencias pendientes
   */
  return (
    <div className="space-y-6">
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      {pendingIntents.length > 0 ? (
        <PanelSection title={t("platform.pendingTransfers")}>
          <ul className="space-y-3">
            {pendingIntents.map((intent) => (
              <li
                key={intent.reference}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-ink/40 px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm text-lime">{intent.reference}</p>
                  <p className="text-xs text-mist">
                    {t("platform.pendingIntentDetail", {
                      reservationId: intent.purposeId,
                      userId: intent.userId,
                      amount: formatMoney(Math.trunc(intent.amountInCents / 100)),
                    })}
                  </p>
                </div>
                <Button
                  variant="primary"
                  isLoading={pendingActionKey === `settle:${intent.reference}`}
                  onClick={() =>
                    void runMutation("settle:" + intent.reference, "/api/platform/payments/intents/settle", "POST", {
                      reference: intent.reference,
                    })
                  }
                >
                  {t("platform.markPaid")}
                </Button>
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}
      <div className="grid gap-5">
        {gateways.map((gateway) => (
          <GatewayCard
            key={gateway.code}
            gateway={gateway}
            isBusy={pendingActionKey?.startsWith(`${gateway.code}:`) ?? false}
            pendingActionKey={pendingActionKey}
            onMutate={runMutation}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Propósito: Tarjeta de una pasarela con switch maestro, métodos y formulario de llaves.
 */
function GatewayCard({
  gateway,
  isBusy,
  pendingActionKey,
  onMutate,
}: {
  gateway: AdminPaymentGateway;
  isBusy: boolean;
  pendingActionKey: string | null;
  onMutate: ReturnType<typeof usePlatformMutation>["runMutation"];
}) {
  const { t } = useI18n();
  const [credentialDraft, setCredentialDraft] = useState<Record<string, string>>({});
  const [publicDraft, setPublicDraft] = useState<Record<string, string>>(gateway.publicConfig);
  const endpoint = `/api/platform/payments/gateways/${gateway.code}`;

  /**
   * Output:
   * @returns JSX.Element — Tarjeta de pasarela
   */
  return (
    <article
      className={cn(
        "overflow-hidden rounded-[28px] border bg-pitch",
        gateway.isEnabled ? "border-lime/25" : "border-white/8",
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 px-5 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl text-bone">{gateway.displayName}</h2>
            <StatusPill tone={gateway.isEnabled ? "positive" : "neutral"}>
              {gateway.isEnabled ? t("common.onFemale") : t("common.offFemale")}
            </StatusPill>
            {gateway.isReady ? (
              <StatusPill tone="positive">{t("platform.gatewayReady")}</StatusPill>
            ) : (
              <StatusPill tone="warning">{t("platform.gatewayMissing")}</StatusPill>
            )}
            {gateway.isTestMode ? <StatusPill tone="warning">{t("platform.gatewayTest")}</StatusPill> : null}
          </div>
          <p className="mt-1 max-w-xl text-sm text-mist">{gateway.description}</p>
        </div>
        <AdminToggleSwitch
          label={t("platform.enableGateway", { name: gateway.displayName })}
          isOn={gateway.isEnabled}
          disabled={isBusy}
          onToggle={(isEnabled) =>
            void onMutate(`${gateway.code}:enabled`, endpoint, "PUT", { is_enabled: isEnabled })
          }
        />
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mist/80">
            {t("platform.playerMethods")}
          </p>
          <ul className="mt-3 space-y-2">
            {gateway.methods.map((method) => (
              <li
                key={method.methodId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-ink/30 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <MethodGlyph code={method.code} />
                  <div>
                    <p className="text-sm font-semibold text-bone">{method.displayName}</p>
                    <p className="text-xs text-mist">{method.description}</p>
                  </div>
                </div>
                <AdminToggleSwitch
                  label={t("platform.showMethod", { name: method.displayName })}
                  isOn={method.isEnabled}
                  disabled={isBusy}
                  onToggle={(isEnabled) =>
                    void onMutate(
                      `${gateway.code}:method:${method.methodId}`,
                      `/api/platform/payments/methods/${method.methodId}`,
                      "PUT",
                      { is_enabled: isEnabled },
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <label className="flex items-center justify-between gap-3 text-sm text-bone">
            <span>{t("platform.testMode")}</span>
            <AdminToggleSwitch
              label={t("platform.testMode")}
              isOn={gateway.isTestMode}
              disabled={isBusy}
              onToggle={(isTestMode) =>
                void onMutate(`${gateway.code}:test`, endpoint, "PUT", { is_test_mode: isTestMode })
              }
            />
          </label>

          {gateway.publicConfigFields.length > 0 ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                void onMutate(`${gateway.code}:public`, endpoint, "PUT", {
                  public_config: publicDraft,
                });
              }}
            >
              {gateway.publicConfigFields.map((field) => (
                <label key={field.key} className="block space-y-1">
                  <span className="text-xs font-medium text-mist">{field.label}</span>
                  <input
                    value={publicDraft[field.key] ?? ""}
                    onChange={(event) =>
                      setPublicDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-ink/40 px-3 py-2.5 text-sm text-bone outline-none focus:border-lime/70"
                    required={field.required}
                    maxLength={160}
                  />
                  {field.helpText ? <span className="text-[11px] text-mist/70">{field.helpText}</span> : null}
                </label>
              ))}
              <Button type="submit" variant="secondary" isLoading={pendingActionKey === `${gateway.code}:public`}>
                {t("platform.savePublicKey")}
              </Button>
            </form>
          ) : null}

          {gateway.credentialFields.length > 0 ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const credentials = Object.fromEntries(
                  Object.entries(credentialDraft).filter(([, value]) => value.trim()),
                );
                void onMutate(`${gateway.code}:creds`, `${endpoint}/credentials`, "PUT", { credentials });
                setCredentialDraft({});
              }}
            >
              {gateway.credentialFields.map((field) => (
                <label key={field.key} className="block space-y-1">
                  <span className="text-xs font-medium text-mist">
                    {field.label}
                    {field.isSet ? (
                      <span className="ml-2 font-mono text-[11px] text-lime/80">{field.hint}</span>
                    ) : (
                      <span className="ml-2 text-[11px] text-clay">{t("platform.notConfigured")}</span>
                    )}
                  </span>
                  <input
                    type={field.inputType}
                    value={credentialDraft[field.key] ?? ""}
                    placeholder={field.isSet ? t("platform.leaveBlank") : field.placeholder}
                    autoComplete="off"
                    onChange={(event) =>
                      setCredentialDraft((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-ink/40 px-3 py-2.5 text-sm text-bone outline-none focus:border-lime/70"
                    maxLength={200}
                  />
                  {field.helpText ? <span className="text-[11px] text-mist/70">{field.helpText}</span> : null}
                </label>
              ))}
              <Button type="submit" isLoading={pendingActionKey === `${gateway.code}:creds`}>
                {t("platform.saveKeys")}
              </Button>
            </form>
          ) : (
            <p className="text-xs text-mist">{t("platform.noSecretKeys")}</p>
          )}
        </section>
      </div>
    </article>
  );
}

/**
 * Propósito: Glifo del medio de pago (tarjeta, PSE, Nequi, llave).
 */
function MethodGlyph({ code }: { code: string }) {
  /**
   * Output:
   * @returns JSX.Element — SVG 20px
   */
  return (
    <span className="flex size-9 items-center justify-center rounded-xl bg-lime/12 text-lime">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d={PAYMENT_METHOD_ICON[code] ?? PAYMENT_METHOD_ICON.sandbox} />
      </svg>
    </span>
  );
}
