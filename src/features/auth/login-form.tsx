"use client";

import { useI18n } from "@/core/i18n/provider";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { PasswordField } from "@/shared/ui/password-field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const SECURITY_PATH = "/seguridad";

interface LoginResponse {
  message?: string;
  user?: { roles?: string[] };
  twoFactorRequired?: boolean;
  twoFactorSetupRequired?: boolean;
}

/**
 * Propósito: Destino tras iniciar sesión: el `next` pedido (solo rutas internas), la
 * configuración de 2FA si es obligatoria, o el panel/agenda según el rol.
 */
function resolvePostLoginPath(payload: LoginResponse, nextPath: string | null): string {
  if (payload.twoFactorSetupRequired) {
    /**
     * Output:
     * @returns string — Página de seguridad (2FA obligatorio pendiente)
     */
    return SECURITY_PATH;
  }
  if (nextPath) {
    /**
     * Output:
     * @returns string — Ruta solicitada antes del login
     */
    return nextPath;
  }
  const roles = payload.user?.roles ?? [];
  const isVenueStaff = roles.some((role) =>
    ["admin", "establishment_owner", "manager"].includes(role),
  );
  /**
   * Output:
   * @returns string — Panel para staff, agenda para jugadores
   */
  return isVenueStaff ? "/admin" : "/reservas";
}

/**
 * Propósito: Login en dos pasos: credenciales y, si la cuenta tiene 2FA, el código de la app
 * autenticadora (o uno de respaldo). El desafío viaja en cookie httpOnly, no en el cliente.
 */
export function LoginForm({ nextPath = null }: { nextPath?: string | null }) {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAwaitingCode, setIsAwaitingCode] = useState(false);

  /**
   * Propósito: Envía un paso del login al BFF y navega si ya hay sesión.
   */
  async function submitStep(endpoint: string, body: Record<string, string>) {
    setError(null);
    setIsSubmitting(true);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as LoginResponse;

    if (!response.ok) {
      setError(payload.message ?? t("auth.loginFailed"));
      setIsSubmitting(false);
      /**
       * Output:
       * Side effects — Muestra el error
       */
      return;
    }
    if (payload.twoFactorRequired) {
      setIsAwaitingCode(true);
      setIsSubmitting(false);
      /**
       * Output:
       * Side effects — Pasa al paso del código
       */
      return;
    }
    router.push(resolvePostLoginPath(payload, nextPath));
    router.refresh();
    /**
     * Output:
     * Side effects — Navega al destino
     */
  }

  /**
   * Propósito: Paso 1, correo y contraseña.
   */
  function handleCredentialsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void submitStep("/api/auth/login", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  }

  /**
   * Propósito: Paso 2, código de verificación.
   */
  function handleCodeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void submitStep("/api/auth/login/2fa", { code: String(formData.get("code") ?? "") });
  }

  if (isAwaitingCode) {
    /**
     * Output:
     * @returns JSX.Element — Paso del código de verificación
     */
    return (
      <form onSubmit={handleCodeSubmit} className="space-y-5">
        {error ? <Alert>{error}</Alert> : null}
        <p className="text-sm text-mist">{t("auth.twoFactorHint")}</p>
        <TextField
          label={t("auth.verificationCode")}
          name="code"
          inputMode="text"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={16}
          placeholder="123456"
        />
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          {t("auth.verify")}
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm text-mist hover:text-bone"
          onClick={() => {
            setIsAwaitingCode(false);
            setError(null);
          }}
        >
          {t("auth.useAnotherAccount")}
        </button>
      </form>
    );
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de acceso
   */
  return (
    <form onSubmit={handleCredentialsSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      <TextField
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="username"
        required
        placeholder="tu@correo.com"
      />
      <PasswordField
        label={t("auth.password")}
        name="password"
        autoComplete="current-password"
        required
      />
      <div className="-mt-2 text-right">
        <Link href="/recuperar" className="text-sm text-mist hover:text-lime">
          {t("auth.forgotPassword")}
        </Link>
      </div>
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        {t("auth.enterPitch")}
      </Button>
      <p className="text-center text-sm text-mist">
        {t("auth.noAccountYet")}{" "}
        <Link href="/registro" className="text-lime hover:underline">
          {t("auth.createYourAccount")}
        </Link>
      </p>
    </form>
  );
}
