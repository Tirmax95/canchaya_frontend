import { getSession } from "@/core/auth/session";
import { AuthShell } from "@/features/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";
import { Alert } from "@/shared/ui/alert";
import { toSafeInternalPath } from "@/shared/lib/url";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Iniciar sesión" };

const LOGIN_NOTICES: Record<string, string> = {
  sesion: "Tu sesión se cerró (venció, se cerró en otro dispositivo o la cuenta fue bloqueada). Vuelve a entrar.",
  clave: "Tu contraseña se actualizó. Entra con la nueva.",
  "2fa": "Desactivaste la verificación en dos pasos. Vuelve a entrar.",
};

/**
 * Propósito: Página de acceso. Si ya hay sesión, evita el formulario.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; motivo?: string }>;
}) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const nextPath = toSafeInternalPath(params.next);
  if (session) {
    redirect(nextPath ?? "/reservas");
  }
  const notice = params.motivo ? LOGIN_NOTICES[params.motivo] : undefined;

  /**
   * Output:
   * @returns JSX.Element — Auth layout
   */
  return (
    <AuthShell
      title="Entra al partido"
      subtitle="Jugadores globales, dueños aislados por organización. Demo: cubo@canchaya.test, dany@canchaya.test o jugador@canchaya.test / CanchaYa123."
    >
      {notice ? (
        <div className="mb-5">
          <Alert tone="info">{notice}</Alert>
        </div>
      ) : null}
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
