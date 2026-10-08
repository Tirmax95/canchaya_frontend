import Link from "next/link";

/**
 * Propósito: Pie de página compacto con enlaces de producto.
 */
export function SiteFooter() {
  /**
   * Output:
   * @returns JSX.Element — Footer
   */
  return (
    <footer className="border-t border-white/8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-mist sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>CanchaYa · Reserva canchas en minutos.</p>
        <div className="flex gap-4">
          <Link href="/establecimientos" className="hover:text-bone">
            Sedes
          </Link>
          <Link href="/canchas" className="hover:text-bone">
            Canchas
          </Link>
          <Link href="/reservas/nueva" className="hover:text-bone">
            Reservar
          </Link>
        </div>
      </div>
    </footer>
  );
}
