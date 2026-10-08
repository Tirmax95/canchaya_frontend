import { requireSession } from "@/core/auth/session";
import { ProfileForm } from "@/features/profile/profile-form";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perfil" };

/**
 * Propósito: Edición del perfil del usuario en sesión.
 */
export default async function ProfilePage() {
  const session = await requireSession();

  /**
   * Output:
   * @returns JSX.Element — Perfil
   */
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Cuenta"
        title="Tu perfil"
        description={`Roles: ${session.roles.join(", ") || "client"}`}
      />
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
        <ProfileForm user={session} />
      </div>
    </div>
  );
}
