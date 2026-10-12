"use client";

import { useI18n } from "@/core/i18n/provider";
import { translatePasswordPolicyViolation } from "@/core/i18n/password-messages";
import { PASSWORD_MIN_LENGTH } from "@/domain/password-policy";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { PasswordField } from "@/shared/ui/password-field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Alta de jugador global o dueño de sede, con login automático vía BFF.
 */
export function RegisterForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVenueOwner, setIsVenueOwner] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const isConfirmationMismatch =
    passwordConfirmation.length > 0 && passwordConfirmation !== password;

  /**
   * Propósito: Crea la cuenta y deja la sesión lista para reservar o publicar.
   * Valida política y confirmación en cliente antes de ir al BFF (que las revalida).
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const passwordViolation =
      translatePasswordPolicyViolation(password, t) ??
      (password !== passwordConfirmation ? t("auth.passwordsMismatch") : null);
    if (passwordViolation) {
      setError(passwordViolation);
      /**
       * Output:
       * Side effects — Muestra el primer problema de contraseña sin llamar al BFF
       */
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        password,
        passwordConfirmation,
        phone: String(formData.get("phone") ?? ""),
        isVenueOwner,
        organizationName: String(formData.get("organizationName") ?? ""),
      }),
    });
    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setError(payload.message ?? t("auth.registerFailed"));
      setIsSubmitting(false);
      /**
       * Output:
       * Side effects — Muestra el error devuelto por el BFF
       */
      return;
    }

    router.push(isVenueOwner ? "/admin" : "/establecimientos");
    router.refresh();
    /**
     * Output:
     * Side effects — Navega al panel de sede o al catálogo según el tipo de cuenta
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de registro
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      <TextField
        label={t("auth.fullName")}
        name="fullName"
        required
        autoComplete="name"
        placeholder="Alexis Losada"
      />
      <TextField label={t("auth.email")} name="email" type="email" required autoComplete="username" />
      <TextField
        label={t("auth.phone")}
        name="phone"
        placeholder="+573001112233"
        hint={t("auth.phoneHint")}
      />
      <PasswordField
        label={t("auth.password")}
        name="password"
        required
        minLength={PASSWORD_MIN_LENGTH}
        autoComplete="new-password"
        showRequirements
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordField
        label={t("auth.confirmPassword")}
        name="passwordConfirmation"
        required
        autoComplete="new-password"
        value={passwordConfirmation}
        onChange={(event) => setPasswordConfirmation(event.target.value)}
        error={isConfirmationMismatch ? t("auth.passwordsMismatch") : undefined}
      />
      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-ink/30 px-4 py-3 text-sm text-mist">
        <input
          type="checkbox"
          checked={isVenueOwner}
          onChange={(event) => setIsVenueOwner(event.target.checked)}
          className="mt-1 accent-lime"
        />
        <span>{t("auth.ownerCheckbox")}</span>
      </label>
      {isVenueOwner ? (
        <TextField
          label={t("auth.organizationName")}
          name="organizationName"
          required
          placeholder="El Cubo"
          hint={t("auth.organizationHint")}
        />
      ) : null}
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        {isVenueOwner ? t("auth.createVenue") : t("auth.createAndPlay")}
      </Button>
      <p className="text-center text-sm text-mist">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/login" className="text-lime hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </form>
  );
}
