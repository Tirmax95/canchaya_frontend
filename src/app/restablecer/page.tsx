import { OPAQUE_TOKEN_PATTERN } from "@/domain/schemas";
import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { Alert } from "@/shared/ui/alert";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Nueva contraseña",
  referrer: "no-referrer",
};

/**
 * Propósito: Formulario de contraseña nueva desde el enlace del correo. `no-referrer` evita
 * que el token salga en el Referer hacia otros sitios.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const isTokenWellFormed = typeof token === "string" && OPAQUE_TOKEN_PATTERN.test(token);

  /**
   * Output:
   * @returns JSX.Element — Formulario o aviso de enlace inválido
   */
  return (
    <AuthShell
      title="Crea tu contraseña nueva"
      subtitle="Al guardarla se cerrarán las sesiones abiertas en otros dispositivos."
    >
      {isTokenWellFormed ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <Alert>El enlace no es válido o está incompleto.</Alert>
          <Link href="/recuperar" className="text-sm text-lime hover:underline">
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
