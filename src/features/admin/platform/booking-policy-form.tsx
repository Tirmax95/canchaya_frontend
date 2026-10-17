"use client";

import type { MessageKey } from "@/core/i18n/messages";
import { useI18n } from "@/core/i18n/provider";
import {
  BOOKING_POLICY_LIMITS,
  type BookingPolicy,
  type BookingPolicyNumericKey,
  type BookingPolicyRecord,
} from "@/domain/platform";
import { AdminToggleSwitch, PanelSection } from "@/features/admin/platform/platform-ui";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { useState, type FormEvent } from "react";

type DraftValues = Record<BookingPolicyNumericKey, string>;

/**
 * Propósito: Copia editable (strings) de los campos numéricos de la política.
 */
function toDraft(policy: BookingPolicy): DraftValues {
  /**
   * Output:
   * @returns DraftValues — Valores como texto para los inputs
   */
  return {
    onlinePaymentWindowMinutes: String(policy.onlinePaymentWindowMinutes),
    onlinePaymentGraceMinutes: String(policy.onlinePaymentGraceMinutes),
    manualConfirmationWindowMinutes: String(policy.manualConfirmationWindowMinutes),
    manualConfirmationCutoffMinutes: String(policy.manualConfirmationCutoffMinutes),
    sweepIntervalMinutes: String(policy.sweepIntervalMinutes),
    maxOpenPendingPerUser: String(policy.maxOpenPendingPerUser),
  };
}

/**
 * Propósito: True si el texto es un entero dentro del rango permitido para ese campo.
 */
function isWithinLimits(key: BookingPolicyNumericKey, raw: string): boolean {
  const value = Number(raw);
  const { min, max } = BOOKING_POLICY_LIMITS[key];
  /**
   * Output:
   * @returns boolean — Valor válido
   */
  return raw.trim() !== "" && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * Propósito: Formulario del super admin para las reglas de vencimiento de reservas.
 * El backend vuelve a validar cada rango; aquí solo se adelanta el error.
 */
export function BookingPolicyForm({ policy }: { policy: BookingPolicyRecord }) {
  const { t, intlLocale } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const [expirationEnabled, setExpirationEnabled] = useState(policy.expirationEnabled);
  const [draft, setDraft] = useState<DraftValues>(() => toDraft(policy));
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const isSaving = pendingActionKey !== null;
  const invalidKeys = (Object.keys(draft) as BookingPolicyNumericKey[]).filter(
    (key) => !isWithinLimits(key, draft[key]),
  );

  /**
   * Propósito: Input numérico de una regla con su pista de rango.
   */
  function renderField(key: BookingPolicyNumericKey, label: string, hintKey: MessageKey) {
    const { min, max } = BOOKING_POLICY_LIMITS[key];
    const hint = t(hintKey, { min, max });
    /**
     * Output:
     * @returns JSX.Element — Campo con error si está fuera de rango
     */
    return (
      <TextField
        name={key}
        label={label}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        required
        value={draft[key]}
        disabled={isSaving}
        onChange={(event) => {
          const nextValue = event.target.value;
          setSavedAt(null);
          setDraft((current) => ({ ...current, [key]: nextValue }));
        }}
        hint={hint}
        error={invalidKeys.includes(key) ? hint : undefined}
      />
    );
  }

  /**
   * Propósito: Envía la política completa al BFF.
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalidKeys.length > 0) {
      /**
       * Output:
       * Side effects — Nada: hay campos fuera de rango
       */
      return;
    }
    const body: BookingPolicy = {
      expirationEnabled,
      onlinePaymentWindowMinutes: Number(draft.onlinePaymentWindowMinutes),
      onlinePaymentGraceMinutes: Number(draft.onlinePaymentGraceMinutes),
      manualConfirmationWindowMinutes: Number(draft.manualConfirmationWindowMinutes),
      manualConfirmationCutoffMinutes: Number(draft.manualConfirmationCutoffMinutes),
      sweepIntervalMinutes: Number(draft.sweepIntervalMinutes),
      maxOpenPendingPerUser: Number(draft.maxOpenPendingPerUser),
    };
    const result = await runMutation<{ policy: BookingPolicyRecord }>(
      "booking-policy",
      "/api/platform/booking-policy",
      "PUT",
      body,
    );
    if (result) {
      setDraft(toDraft(result.policy));
      setExpirationEnabled(result.policy.expirationEnabled);
      setSavedAt(result.policy.updatedAt);
    }
    /**
     * Output:
     * Side effects — Política guardada y página refrescada
     */
  }

  const lastUpdated = savedAt ?? policy.updatedAt;

  /**
   * Output:
   * @returns JSX.Element — Formulario por secciones
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      {savedAt ? <Alert tone="info">{t("bookingPolicy.saved")}</Alert> : null}

      <PanelSection title={t("bookingPolicy.expirationTitle")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-bone">{t("bookingPolicy.expirationEnabled")}</p>
            <p className="mt-1 max-w-xl text-sm text-mist">
              {t("bookingPolicy.expirationEnabledHint")}
            </p>
          </div>
          <AdminToggleSwitch
            label={t("bookingPolicy.expirationEnabled")}
            isOn={expirationEnabled}
            disabled={isSaving}
            onToggle={(next) => {
              setSavedAt(null);
              setExpirationEnabled(next);
            }}
          />
        </div>
      </PanelSection>

      <div className={expirationEnabled ? "space-y-6" : "space-y-6 opacity-60"}>
        <PanelSection title={t("bookingPolicy.onlineTitle")}>
          <div className="grid gap-4 md:grid-cols-2">
            {renderField(
              "onlinePaymentWindowMinutes",
              t("bookingPolicy.onlineWindow"),
              "bookingPolicy.onlineWindowHint",
            )}
            {renderField(
              "onlinePaymentGraceMinutes",
              t("bookingPolicy.onlineGrace"),
              "bookingPolicy.onlineGraceHint",
            )}
          </div>
        </PanelSection>

        <PanelSection title={t("bookingPolicy.manualTitle")}>
          <div className="grid gap-4 md:grid-cols-2">
            {renderField(
              "manualConfirmationWindowMinutes",
              t("bookingPolicy.manualWindow"),
              "bookingPolicy.manualWindowHint",
            )}
            {renderField(
              "manualConfirmationCutoffMinutes",
              t("bookingPolicy.manualCutoff"),
              "bookingPolicy.manualCutoffHint",
            )}
          </div>
        </PanelSection>
      </div>

      <PanelSection title={t("bookingPolicy.limitsTitle")}>
        <div className="grid gap-4 md:grid-cols-2">
          {renderField(
            "sweepIntervalMinutes",
            t("bookingPolicy.sweepInterval"),
            "bookingPolicy.sweepIntervalHint",
          )}
          {renderField(
            "maxOpenPendingPerUser",
            t("bookingPolicy.maxOpenPending"),
            "bookingPolicy.maxOpenPendingHint",
          )}
        </div>
      </PanelSection>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-mist">
          <p>{t("bookingPolicy.appliesNote")}</p>
          <p className="mt-1">
            {lastUpdated
              ? t("bookingPolicy.lastUpdated", { date: formatDateTime(lastUpdated, intlLocale) })
              : t("bookingPolicy.neverUpdated")}
          </p>
        </div>
        <Button type="submit" isLoading={isSaving} disabled={invalidKeys.length > 0}>
          {t("bookingPolicy.save")}
        </Button>
      </div>
    </form>
  );
}
