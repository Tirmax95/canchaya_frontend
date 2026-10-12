import { requireSession, toClientUser } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import {
  getMyGamification,
  getMyLedger,
  getMyNotifications,
} from "@/data/pickup.repository";
import { ProfileForm } from "@/features/profile/profile-form";
import { formatMoney } from "@/shared/lib/money";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Título de perfil según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("profile.title") };
}

/**
 * Propósito: Perfil + XP, racha, insignias, ledger y bandeja del actor.
 */
export default async function ProfilePage() {
  const [{ t, intlLocale }, session] = await Promise.all([getTranslator(), requireSession()]);
  const [xp, ledger, inbox] = await Promise.all([
    getMyGamification().catch(() => null),
    getMyLedger().catch(() => null),
    getMyNotifications().catch(() => null),
  ]);
  const phoneLabel = session.phone ?? t("profile.noPhone");

  /**
   * Output:
   * @returns JSX.Element — Perfil de juego y cuenta
   */
  return (
    <div className="mx-auto max-w-xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("profile.kicker")}
        title={t("profile.heading")}
        description={`${session.fullName ?? session.email} · ${phoneLabel}`}
      />
      {xp ? (
        <section className="rounded-[32px] border border-white/8 bg-pitch p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-lime">{xp.levelBadge}</p>
          <p className="mt-2 font-display text-6xl tabular-nums text-flare">{xp.xp}</p>
          <p className="text-sm text-mist">{t("profile.xpLevel", { level: xp.level })}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-mist">
            <span>{t("profile.streak", { weeks: xp.currentStreakWeeks })}</span>
            <span>{t("profile.bestStreak", { weeks: xp.bestStreakWeeks })}</span>
            <span>{t("profile.attendances", { count: xp.attendanceCount })}</span>
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
          <p className="text-sm text-mist">{t("profile.ledgerBalance")}</p>
          <p className="font-display text-3xl tabular-nums text-bone">
            {formatMoney(ledger.balance, intlLocale, t("common.consult"))}
          </p>
        </section>
      ) : null}
      {inbox ? (
        <section className="space-y-3 rounded-[32px] border border-white/8 bg-pitch p-6">
          <p className="text-sm text-mist">
            {t("profile.notificationsUnread", { count: inbox.unreadCount })}
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
        <ProfileForm user={toClientUser(session)} />
      </div>
      <Link
        href="/seguridad"
        className="flex items-center justify-between rounded-[32px] border border-white/8 bg-pitch p-6 text-sm hover:border-lime/40"
      >
        <span>
          <span className="block text-bone">{t("profile.securityTitle")}</span>
          <span className="text-mist">{t("profile.securityHint")}</span>
        </span>
        <span className="text-lime">{t("profile.configure")}</span>
      </Link>
    </div>
  );
}
