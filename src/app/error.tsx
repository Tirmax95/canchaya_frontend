"use client";

/**
 * Propósito: Error boundary de ruta sin filtrar stacks al usuario.
 */
export default function RouteError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl text-bone">Algo se salió de la cancha</h1>
      <p className="mt-3 text-sm text-mist">
        Intenta de nuevo. Si sigue fallando, revisa que el API esté en línea.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-lime px-5 py-2 text-sm font-semibold text-ink"
      >
        Reintentar
      </button>
    </div>
  );
}
