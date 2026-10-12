import { getTranslator } from "@/core/i18n/get-locale";
import { FeaturedEstablishments } from "@/features/catalog/featured-establishments";
import { ButtonLink } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import Link from "next/link";
import { Suspense } from "react";

/**
 * Propósito: Landing de producto. El hero no espera al API; el catálogo va en Suspense.
 */
export default async function HomePage() {
  const { t } = await getTranslator();
  const steps = [
    ["01", t("home.step1Title"), t("home.step1Body")],
    ["02", t("home.step2Title"), t("home.step2Body")],
    ["03", t("home.step3Title"), t("home.step3Body")],
  ] as const;

  /**
   * Output:
   * @returns JSX.Element — Home de marketing + sedes
   */
  return (
    <div>
      <section className="relative overflow-hidden pitch-grid">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-lime">
              {t("home.kicker")}
            </p>
            <h1 className="mt-4 max-w-xl font-display text-6xl leading-[0.9] text-bone sm:text-7xl">
              {t("home.title")}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-mist">
              {t("home.body")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/partidos">{t("home.seeMatches")}</ButtonLink>
              <ButtonLink href="/establecimientos" variant="secondary">
                {t("home.exploreVenues")}
              </ButtonLink>
              <ButtonLink href="/registro" variant="ghost">
                {t("home.createAccount")}
              </ButtonLink>
            </div>
          </div>
          <div className="relative min-h-80 overflow-hidden rounded-[36px] border border-white/10">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1400&q=80)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
            <div className="absolute bottom-0 p-6">
              <p className="font-display text-3xl text-bone">{t("home.heroCardTitle")}</p>
              <p className="mt-1 text-sm text-mist">{t("home.heroCardBody")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(([step, title, copy]) => (
            <article
              key={step}
              className="rounded-[28px] border border-white/8 bg-pitch p-6"
            >
              <p className="font-display text-4xl text-lime">{step}</p>
              <h2 className="mt-3 font-display text-2xl text-bone">{title}</h2>
              <p className="mt-2 text-sm text-mist">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-lime">
              {t("home.featuredKicker")}
            </p>
            <h2 className="mt-2 font-display text-4xl text-bone">{t("home.featuredTitle")}</h2>
          </div>
          <Link href="/establecimientos" className="text-sm text-lime hover:underline">
            {t("home.seeAll")}
          </Link>
        </div>
        <Suspense fallback={<Spinner label={t("home.searchingVenues")} />}>
          <FeaturedEstablishments />
        </Suspense>
      </section>
    </div>
  );
}
