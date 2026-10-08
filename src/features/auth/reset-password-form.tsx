"use client";

import { getPasswordPolicyViolation } from "@/domain/password-policy";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { PasswordField } from "@/shared/ui/password-field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Crea la contraseña nueva con el token del enlace (misma política que el registro).
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const isConfirmationMismatch =
    passwordConfirmation.length > 0 && passwordConfirmation !== password;

  /**
   * Propósito: Valida en cliente y envía al BFF (que revalida).
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passwordViolation =
      getPasswordPolicyViolation(password) ??
      (password !== passwordConfirmation ? "Las contraseñas no coinciden" : null);
    if (passwordViolation) {
      setError(passwordViolation);
      /**
       * Output:
       * Side effects — Muestra el problema sin llamar al BFF
       */
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const response = await fetch("/api/auth/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, passwordConfirmation }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? "No se pudo cambiar la contraseña");
      setIsSubmitting(false);
      /**
       * Output:
       * Side effects — Muestra el error (enlace vencido o política)
       */
      return;
    }
    router.replace("/login?motivo=clave");
    router.refresh();
    /**
     * Output:
     * Side effects — Lleva al login con aviso de éxito
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de contraseña nueva
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <Alert>
          {error}{" "}
          {error.includes("enlace") ? (
            <Link href="/recuperar" className="underline">
              Pedir otro enlace
            </Link>
          ) : null}
        </Alert>
      ) : null}
      <PasswordField
        label="Contraseña nueva"
        name="password"
        autoComplete="new-password"
        required
        showRequirements
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <PasswordField
        label="Repite la contraseña"
        name="passwordConfirmation"
        autoComplete="new-password"
        required
        value={passwordConfirmation}
        onChange={(event) => setPasswordConfirmation(event.target.value)}
        error={isConfirmationMismatch ? "Las contraseñas no coinciden" : undefined}
      />
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Guardar contraseña
      </Button>
    </form>
  );
}
