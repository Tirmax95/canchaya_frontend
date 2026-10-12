import { getTranslator } from "@/core/i18n/get-locale";
import { OPAQUE_TOKEN_PATTERN } from "@/domain/schemas";
import { AuthShell } from "@/features/auth/auth-shell";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";
import { Alert } from "@/shared/ui/alert";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Título de restablecimiento según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título y referrer
   */
  return {
    title: t("auth.resetTitle"),
    referrer: "no-referrer",
  };
}

/**
 * Propósito: Formulario de contraseña nueva desde el enlace del correo. `no-referrer` evita
 * que el token salga en el Referer hacia otros sitios.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ t }, { token }] = await Promise.all([getTranslator(), searchParams]);
  const isTokenWellFormed = typeof token === "string" && OPAQUE_TOKEN_PATTERN.test(token);

  /**
   * Output:
   * @returns JSX.Element — Formulario o aviso de enlace inválido
   */
  return (
    <AuthShell title={t("auth.resetHeading")} subtitle={t("auth.resetSubtitle")}>
      {isTokenWellFormed ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-4">
          <Alert>{t("auth.invalidLink")}</Alert>
          <Link href="/recuperar" className="text-sm text-lime hover:underline">
            {t("auth.requestNewLink")}
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
