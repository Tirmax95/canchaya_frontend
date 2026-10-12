import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import { getSession } from "@/core/auth/session";
import { getLocale, getTranslator } from "@/core/i18n/get-locale";
import { I18nProvider } from "@/core/i18n/provider";
import { QueryProvider } from "@/widgets/query-provider";
import { SessionProvider } from "@/widgets/session-provider";
import { ClientErrorReporter } from "@/widgets/client-error-reporter";
import { SiteFooter } from "@/widgets/site-footer";
import { SiteHeader } from "@/widgets/site-header";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

export const dynamic = "force-dynamic";

/**
 * Propósito: Metadata del documento según el idioma de la cookie o Accept-Language.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título y descripción localizados
   */
  return {
    title: {
      default: t("meta.defaultTitle"),
      template: t("meta.titleTemplate"),
    },
    description: t("meta.description"),
  };
}

/**
 * Propósito: Shell global: tipografía, sesión hidratada y navegación.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);

  /**
   * Output:
   * @returns JSX.Element — Documento HTML de la app
   */
  return (
    <html lang={locale}>
      <body className={`${outfit.variable} ${syne.variable} antialiased`}>
        <I18nProvider locale={locale}>
          <QueryProvider>
            <SessionProvider user={session}>
              <ClientErrorReporter />
              <div className="flex min-h-screen flex-col">
                <SiteHeader />
                <main className="flex-1">{children}</main>
                <SiteFooter />
              </div>
            </SessionProvider>
          </QueryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
