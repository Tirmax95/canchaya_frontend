import { requireSession } from "@/core/auth/session";
import {
  getMyGamification,
  getMyLedger,
  getMyNotifications,
} from "@/data/pickup.repository";
import { ProfileForm } from "@/features/profile/profile-form";
import { formatMoney } from "@/shared/lib/money";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perfil" };

/**
 * Propósito: Perfil + XP, racha, insignias, ledger y bandeja del actor.
 */
export default async function ProfilePage() {
  const session = await requireSession();
  const [xp, ledger, inbox] = await Promise.all([
    getMyGamification().catch(() => null),
    getMyLedger().catch(() => null),
    getMyNotifications().catch(() => null),
  ]);

  /**
   * Output:
   * @returns JSX.Element — Perfil de juego y cuenta
   */
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Cuenta"
        title="Tu perfil"
        description={`${session.fullName ?? session.email} · ${session.phone ?? "sin celular"}`}
      />
      {xp ? (
        <section className="rounded-[32px] border border-white/8 bg-pitch p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-lime">
            {xp.levelBadge}
          </p>
          <p className="mt-2 font-display text-6xl tabular-nums text-flare">
            {xp.xp}
          </p>
          <p className="text-sm text-mist">XP · nivel {xp.level}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-mist">
            <span>Racha {xp.currentStreakWeeks} sem</span>
            <span>Mejor {xp.bestStreakWeeks}</span>
            <span>{xp.attendanceCount} asistencias</span>
          </div>
          {xp.badges.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {xp.badges.map((badge) => (
                <span
                  key={badge.code}
                  className="rounded-full bg-white/8 px-3 py-1 text-xs text-bone"
                >
                  {badge.name}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      {ledger ? (
        <section className="rounded-[32px] border border-white/8 bg-pitch p-6">
          <p className="text-sm text-mist">Saldo del ledger</p>
          <p className="font-display text-3xl tabular-nums text-bone">
            {formatMoney(ledger.balance)}
          </p>
        </section>
      ) : null}
      {inbox ? (
        <section className="space-y-3 rounded-[32px] border border-white/8 bg-pitch p-6">
          <p className="text-sm text-mist">
            Notificaciones · {inbox.unreadCount} sin leer
          </p>
          {inbox.notifications.slice(0, 8).map((item) => (
            <article key={item.id} className="border-t border-white/8 pt-3">
              <p className="text-bone">{item.title}</p>
              <p className="text-sm text-mist">{item.body}</p>
            </article>
          ))}
        </section>
      ) : null}
      <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
        <ProfileForm user={session} />
      </div>
    </div>
  );
}
