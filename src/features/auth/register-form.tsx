"use client";

import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Alta de jugador y login automático vía BFF.
 */
export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Propósito: Crea la cuenta y deja la sesión lista para reservar.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      }),
    });
    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setError(payload.message ?? "No se pudo crear la cuenta");
      setIsSubmitting(false);
      return;
    }

    router.push("/establecimientos");
    router.refresh();
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de registro
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      <TextField
        label="Nombre completo"
        name="fullName"
        required
        autoComplete="name"
        placeholder="Alexis Losada"
      />
      <TextField
        label="Correo"
        name="email"
        type="email"
        required
        autoComplete="email"
      />
      <TextField
        label="Teléfono"
        name="phone"
        placeholder="+573001112233"
        hint="Formato internacional, opcional"
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        required
        minLength={6}
        autoComplete="new-password"
      />
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Crear cuenta y jugar
      </Button>
      <p className="text-center text-sm text-mist">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-lime hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
