/**
 * Propósito: Estado vacío consistente para catálogos y reservas.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Bloque vacío
   */
  return (
    <div className="rounded-[28px] border border-dashed border-white/12 bg-white/3 px-6 py-16 text-center">
      <h3 className="font-display text-2xl text-bone">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-mist">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
