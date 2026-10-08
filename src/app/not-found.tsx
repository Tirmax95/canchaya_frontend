import Link from "next/link";

/**
 * Propósito: 404 de producto, no el default de Next.
 */
export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-xs uppercase tracking-[0.28em] text-lime">404</p>
      <h1 className="mt-4 font-display text-5xl text-bone">Cancha no encontrada</h1>
      <p className="mt-3 text-mist">Ese partido no está en el fixture.</p>
      <Link href="/establecimientos" className="mt-6 inline-block text-lime">
        Volver a las sedes
      </Link>
    </div>
  );
}
