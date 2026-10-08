/**
 * Propósito: Indicador de carga accesible para transiciones de página.
 */
export function Spinner({ label = "Cargando" }: { label?: string }) {
  /**
   * Output:
   * @returns JSX.Element — Spinner con texto para lectores de pantalla
   */
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-mist">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-lime/30 border-t-lime" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
