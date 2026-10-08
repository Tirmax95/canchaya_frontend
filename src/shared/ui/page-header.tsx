/**
 * Propósito: Encabezado de página con kicker, título y acción opcional.
 */
export function PageHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Header de sección
   */
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {kicker ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-lime">
            {kicker}
          </p>
        ) : null}
        <h1 className="mt-2 font-display text-4xl leading-none text-bone sm:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-xl text-sm leading-6 text-mist">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
