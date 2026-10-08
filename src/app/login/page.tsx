import { getSession } from "@/core/auth/session";
import { LoginForm } from "@/features/auth/login-form";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Iniciar sesión" };

/**
 * Propósito: Página de acceso. Si ya hay sesión, evita el formulario.
 */
export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/reservas");
  }

  /**
   * Output:
   * @returns JSX.Element — Auth layout
   */
  return (
    <AuthShell
      title="Entra al partido"
      subtitle="Usa tu correo para ver reservas y confirmar horarios."
    >
      <LoginForm />
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <p className="text-xs uppercase tracking-[0.28em] text-lime">CanchaYa</p>
        <h1 className="mt-4 font-display text-6xl leading-none text-bone">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-mist">{subtitle}</p>
      </div>
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6 sm:p-8">
        <h1 className="mb-6 font-display text-4xl text-bone lg:hidden">{title}</h1>
        {children}
      </div>
    </div>
  );
}
