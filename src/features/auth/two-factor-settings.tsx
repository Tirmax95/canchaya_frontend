"use client";

import { useI18n } from "@/core/i18n/provider";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface TwoFactorSettingsProps {
  isEnabled: boolean;
  isMandatory: boolean;
  recoveryCodesRemaining: number;
  continuePath: string;
}

type SetupStep =
  | { kind: "idle" }
  | { kind: "scanning"; secret: string; qrCodeDataUrl: string }
  | { kind: "recovery_codes"; recoveryCodes: string[] };

/**
 * Propósito: POST JSON al BFF devolviendo cuerpo y estado (un solo punto de fetch).
 */
async function postJson<T>(endpoint: string, body?: unknown): Promise<{ ok: boolean; payload: T & { message?: string } }> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as T & { message?: string };
  /**
   * Output:
   * @returns { ok, payload } — Estado HTTP y cuerpo
   */
  return { ok: response.ok, payload };
}

/**
 * Propósito: Configura, muestra o desactiva la verificación en dos pasos (TOTP).
 * Los códigos de respaldo se muestran una única vez tras confirmar.
 */
export function TwoFactorSettings({
  isEnabled,
  isMandatory,
  recoveryCodesRemaining,
  continuePath,
}: TwoFactorSettingsProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<SetupStep>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  /**
   * Propósito: Pide un secreto nuevo y su QR.
   */
  async function startSetup() {
    setError(null);
    setIsBusy(true);
    const { ok, payload } = await postJson<{ setup?: { secret: string; qrCodeDataUrl: string } }>(
      "/api/auth/2fa/setup",
    );
    setIsBusy(false);
    if (!ok || !payload.setup) {
      setError(payload.message ?? t("twoFactor.setupFailed"));
      /**
       * Output:
       * Side effects — Muestra el error
       */
      return;
    }
    setStep({ kind: "scanning", ...payload.setup });
    /**
     * Output:
     * Side effects — Muestra el QR
     */
  }

  /**
   * Propósito: Confirma con el primer código y recibe los códigos de respaldo.
   */
  async function confirmSetup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    const { ok, payload } = await postJson<{ recoveryCodes?: string[] }>("/api/auth/2fa/confirm", { code });
    setIsBusy(false);
    if (!ok || !payload.recoveryCodes) {
      setError(payload.message ?? t("twoFactor.wrongCode"));
      /**
       * Output:
       * Side effects — Muestra el error y deja reintentar
       */
      return;
    }
    setStep({ kind: "recovery_codes", recoveryCodes: payload.recoveryCodes });
    /**
     * Output:
     * Side effects — Muestra los códigos de respaldo
     */
  }

  /**
   * Propósito: Desactiva el 2FA (no disponible si es obligatorio) y vuelve al login.
   */
  async function disable(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsBusy(true);
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    const { ok, payload } = await postJson("/api/auth/2fa/disable", { code });
    setIsBusy(false);
    if (!ok) {
      setError(payload.message ?? t("twoFactor.disableFailed"));
      /**
       * Output:
       * Side effects — Muestra el error
       */
      return;
    }
    router.replace("/login?motivo=2fa");
    router.refresh();
    /**
     * Output:
     * Side effects — Sesión cerrada; vuelve al login
     */
  }

  if (step.kind === "recovery_codes") {
    /**
     * Output:
     * @returns JSX.Element — Códigos de respaldo (única vez)
     */
    return (
      <div className="space-y-5">
        <Alert tone="info">{t("twoFactor.setupActivated")}</Alert>
        <p className="text-sm text-mist">{t("twoFactor.recoveryBody")}</p>
        <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-ink/40 p-4 font-mono text-sm text-bone">
          {step.recoveryCodes.map((recoveryCode) => (
            <li key={recoveryCode}>{recoveryCode}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void navigator.clipboard?.writeText(step.recoveryCodes.join("\n"))}
          >
            {t("twoFactor.copyCodes")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              router.push(continuePath);
              router.refresh();
            }}
          >
            {t("twoFactor.recoverySaved")}
          </Button>
        </div>
      </div>
    );
  }

  if (step.kind === "scanning") {
    /**
     * Output:
     * @returns JSX.Element — QR + confirmación
     */
    return (
      <form onSubmit={confirmSetup} className="space-y-5">
        {error ? <Alert>{error}</Alert> : null}
        <p className="text-sm text-mist">{t("twoFactor.setupBody")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL generada por el backend */}
        <img
          src={step.qrCodeDataUrl}
          alt={t("twoFactor.qrAlt")}
          width={200}
          height={200}
          className="rounded-2xl bg-white p-2"
        />
        <p className="break-all font-mono text-xs text-mist">
          {t("twoFactor.secretManual", { secret: step.secret })}
        </p>
        <TextField
          label={t("twoFactor.sixDigitCode")}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
        />
        <Button type="submit" className="w-full" isLoading={isBusy}>
          {t("twoFactor.activateVerification")}
        </Button>
      </form>
    );
  }

  if (isEnabled) {
    /**
     * Output:
     * @returns JSX.Element — Estado activo (+ desactivar si no es obligatorio)
     */
    return (
      <div className="space-y-5">
        {error ? <Alert>{error}</Alert> : null}
        <Alert tone="info">
          {t("twoFactor.enabledTitle")}{" "}
          {t("twoFactor.recoveryRemaining", { count: recoveryCodesRemaining })}
        </Alert>
        {isMandatory ? (
          <p className="text-sm text-mist">{t("twoFactor.mandatoryNoDisable")}</p>
        ) : (
          <form onSubmit={disable} className="space-y-4">
            <TextField
              label={t("twoFactor.disableLabel")}
              name="code"
              autoComplete="one-time-code"
              maxLength={16}
              required
            />
            <Button type="submit" variant="danger" isLoading={isBusy}>
              {t("twoFactor.disableVerification")}
            </Button>
          </form>
        )}
      </div>
    );
  }

  /**
   * Output:
   * @returns JSX.Element — Invitación a activar
   */
  return (
    <div className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      {isMandatory ? <Alert tone="info">{t("twoFactor.mandatoryAdmin")}</Alert> : null}
      <p className="text-sm text-mist">{t("twoFactor.idleBody")}</p>
      <Button type="button" className="w-full" isLoading={isBusy} onClick={() => void startSetup()}>
        {t("twoFactor.beginSetup")}
      </Button>
    </div>
  );
}
