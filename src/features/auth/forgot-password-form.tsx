"use client";

import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import Link from "next/link";
import { useState } from "react";

/**
 * Propósito: Pide el enlace de restablecimiento. El mensaje es igual exista o no la cuenta.
 */
export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Propósito: Envía el correo al BFF.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(formData.get("email") ?? "") }),
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    setIsSubmitting(false);
    if (!response.ok) {
      setError(payload.message ?? "No se pudo enviar el enlace");
      /**
       * Output:
       * Side effects — Muestra el error (validación o límite de intentos)
       */
      return;
    }
    setConfirmation(payload.message ?? "Revisa tu correo.");
    /**
     * Output:
     * Side effects — Muestra la confirmación neutra
     */
  }

  if (confirmation) {
    /**
     * Output:
     * @returns JSX.Element — Confirmación
     */
    return (
      <div className="space-y-5">
        <Alert tone="info">{confirmation}</Alert>
        <p className="text-sm text-mist">
          El enlace vence en 30 minutos. Revisa también la carpeta de spam.
        </p>
        <Link href="/login" className="text-sm text-lime hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de correo
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      <TextField
        label="Correo de tu cuenta"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="tu@correo.com"
      />
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Enviarme el enlace
      </Button>
      <p className="text-center text-sm text-mist">
        <Link href="/login" className="text-lime hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </form>
  );
}
