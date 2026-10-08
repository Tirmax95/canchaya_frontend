"use client";

import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Formulario de login que autentica contra el BFF y refresca RSC.
 */
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Propósito: Envía credenciales y redirige a reservas si el BFF acepta.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      }),
    });
    const payload = (await response.json()) as {
      message?: string;
      user?: { roles?: string[] };
    };

    if (!response.ok) {
      setError(payload.message ?? "No se pudo iniciar sesión");
      setIsSubmitting(false);
      /**
       * Output:
       * Side effects — Muestra error de credenciales
       */
      return;
    }

    const roles = payload.user?.roles ?? [];
    const isVenueStaff = roles.some((role) =>
      ["admin", "establishment_owner", "manager"].includes(role),
    );
    router.push(isVenueStaff ? "/admin" : "/reservas");
    router.refresh();
    /**
     * Output:
     * Side effects — Navega a la agenda del usuario
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de acceso
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <Alert>{error}</Alert> : null}
      <TextField
        label="Correo"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="tu@correo.com"
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={6}
      />
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        Entrar a la cancha
      </Button>
      <p className="text-center text-sm text-mist">
        ¿Aún no juegas aquí?{" "}
        <Link href="/registro" className="text-lime hover:underline">
          Crea tu cuenta
        </Link>
      </p>
    </form>
  );
}
