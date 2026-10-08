/**
 * Propósito: Layout de las pantallas de cuenta (login, recuperar, seguridad, invitación):
 * mensaje a la izquierda en escritorio y tarjeta con el formulario.
 */
export function AuthShell({
  kicker = "CanchaYa",
  title,
  subtitle,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Layout de autenticación
   */
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
      <div className="hidden lg:block">
        <p className="text-xs uppercase tracking-[0.28em] text-lime">{kicker}</p>
        <h1 className="mt-4 font-display text-6xl leading-none text-bone">{title}</h1>
        <p className="mt-4 max-w-md text-mist">{subtitle}</p>
      </div>
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6 sm:p-8">
        <h1 className="mb-6 font-display text-4xl text-bone lg:hidden">{title}</h1>
        {children}
      </div>
    </div>
  );
}
