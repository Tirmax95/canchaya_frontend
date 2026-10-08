import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import { getSession } from "@/core/auth/session";
import { QueryProvider } from "@/widgets/query-provider";
import { SessionProvider } from "@/widgets/session-provider";
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

export const metadata: Metadata = {
  title: {
    default: "CanchaYa · Reserva tu cancha",
    template: "%s · CanchaYa",
  },
  description:
    "Encuentra sedes, elige tu cancha y reserva el horario en minutos.",
};

/**
 * Propósito: Shell global: tipografía, sesión hidratada y navegación.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  /**
   * Output:
   * @returns JSX.Element — Documento HTML de la app
   */
  return (
    <html lang="es">
      <body className={`${outfit.variable} ${syne.variable} antialiased`}>
        <QueryProvider>
          <SessionProvider user={session}>
            <div className="flex min-h-screen flex-col">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
