import { isStaff } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import Link from "next/link";
import { redirect } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/establecimientos", label: "Sedes" },
  { href: "/admin/canchas", label: "Canchas" },
  { href: "/admin/reservas", label: "Reservas" },
];

/**
 * Propósito: Shell admin. Exige staff; el BFF vuelve a validar cada mutación.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (!isStaff(session)) {
    redirect("/reservas");
  }

  /**
   * Output:
   * @returns JSX.Element — Layout con subnav
   */
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-8 flex flex-wrap gap-2">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-mist hover:border-lime/40 hover:text-bone"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
