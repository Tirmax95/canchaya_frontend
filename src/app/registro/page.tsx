import { getSession } from "@/core/auth/session";
import { RegisterForm } from "@/features/auth/register-form";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Crear cuenta" };

/**
 * Propósito: Alta de jugador. Redirige si ya hay sesión.
 */
export default async function RegisterPage() {
  const session = await getSession();
  if (session) {
    redirect("/establecimientos");
  }

  /**
   * Output:
   * @returns JSX.Element — Registro
   */
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <p className="text-xs uppercase tracking-[0.28em] text-lime">Nuevo jugador</p>
        <h1 className="mt-4 font-display text-6xl leading-none text-bone">
          Arma tu equipo
        </h1>
        <p className="mt-4 max-w-md text-mist">
          Crea tu cuenta en un minuto y reserva la próxima cancha libre.
        </p>
      </div>
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6 sm:p-8">
        <RegisterForm />
      </div>
    </div>
  );
}
