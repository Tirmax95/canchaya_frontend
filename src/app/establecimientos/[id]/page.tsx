import {
  assertViewerCanSeeEstablishment,
  filterFieldsByEstablishment,
  getVisibleFieldCatalog,
} from "@/application/catalog";
import { getTranslator } from "@/core/i18n/get-locale";
import { AMENITY_LABEL_KEYS } from "@/core/i18n/label-keys";
import type { TranslateFn } from "@/core/i18n/translate";
import { getEstablishmentById } from "@/data/establishment.repository";
import {
  buildDirectionsLinks,
  buildInstagramLink,
  buildWhatsAppLink,
  hasLocation,
  type Establishment,
} from "@/domain/establishment";
import { FieldCard } from "@/features/catalog/field-card";
import { AmenityIcon, ContactIcon, type ContactIconName } from "@/features/catalog/venue-icons";
import { VenueMap } from "@/features/maps/venue-map";
import { VenueGallery } from "@/features/venue/venue-gallery";
import { OpenNowBadge, VenueHoursTable } from "@/features/venue/venue-hours";
import { isSafeHttpUrl } from "@/shared/lib/url";
import { EmptyState } from "@/shared/ui/empty-state";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Propósito: Lee y valida el id de la ruta.
 */
function parseEstablishmentId(raw: string): number | null {
  const establishmentId = Number(raw);
  /**
   * Output:
   * @returns number | null — Id entero positivo o null
   */
  return Number.isInteger(establishmentId) && establishmentId > 0 ? establishmentId : null;
}

/**
 * Propósito: Título y descripción con el nombre real de la sede (SEO y previews).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { t } = await getTranslator();
  const establishmentId = parseEstablishmentId((await params).id);
  try {
    if (!establishmentId) {
      throw new Error("invalid id");
    }
    const establishment = await getEstablishmentById(establishmentId);
    /**
     * Output:
     * @returns Metadata — Nombre, ciudad y descripción de la sede
     */
    return {
      title: [establishment.name, establishment.city].filter(Boolean).join(" · "),
      description: establishment.description.slice(0, 160) || establishment.address || undefined,
    };
  } catch {
    return { title: t("common.unknownVenue") };
  }
}

/**
 * Propósito: Bloque titulado de la ficha.
 */
function Section({
  title,
  id,
  children,
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Sección con título
   */
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="font-display text-xl text-bone">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Propósito: Canales de contacto disponibles, en orden de utilidad.
 */
function buildContactLinks(
  establishment: Establishment,
  t: TranslateFn,
): Array<{ href: string; label: string; detail: string; icon: ContactIconName; external: boolean }> {
  const links: Array<{
    href: string;
    label: string;
    detail: string;
    icon: ContactIconName;
    external: boolean;
  }> = [];
  const whatsappLink = buildWhatsAppLink(establishment.whatsapp);
  if (whatsappLink) {
    links.push({ href: whatsappLink, label: t("venue.writeWhatsApp"), detail: establishment.whatsapp, icon: "whatsapp", external: true });
  }
  if (establishment.phone) {
    links.push({ href: `tel:${establishment.phone.replace(/[^\d+]/g, "")}`, label: t("venue.call"), detail: establishment.phone, icon: "phone", external: false });
  }
  if (establishment.email) {
    links.push({ href: `mailto:${establishment.email}`, label: t("venue.sendEmail"), detail: establishment.email, icon: "email", external: false });
  }
  if (isSafeHttpUrl(establishment.website)) {
    links.push({ href: establishment.website, label: t("venue.visitWebsite"), detail: establishment.website.replace(/^https?:\/\//, ""), icon: "website", external: true });
  }
  const instagramLink = buildInstagramLink(establishment.instagram);
  if (instagramLink) {
    links.push({ href: instagramLink, label: "Instagram", detail: `@${establishment.instagram.replace(/^@/, "")}`, icon: "instagram", external: true });
  }
  /**
   * Output:
   * @returns Array — Enlaces de contacto
   */
  return links;
}

/**
 * Propósito: Ficha pública completa de la sede: portada, descripción, servicios, galería,
 * canchas, reglas, contacto, horario y ubicación con rutas. Un par de fetches, sin N+1.
 */
export default async function EstablishmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const establishmentId = parseEstablishmentId((await params).id);
  if (!establishmentId) {
    notFound();
  }

  let data: Awaited<ReturnType<typeof loadVenue>>;
  try {
    data = await loadVenue(establishmentId);
  } catch {
    notFound();
  }
  const { t, establishment, fields } = data;
  const directions = buildDirectionsLinks(establishment);
  const contactLinks = buildContactLinks(establishment, t);
  const location = [establishment.address, establishment.city].filter(Boolean).join(", ");

  /**
   * Output:
   * @returns JSX.Element — Ficha de sede
   */
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <header className="relative overflow-hidden rounded-[36px] border border-white/8 bg-pitch">
        <div
          className="h-64 bg-cover bg-center sm:h-80"
          style={{
            backgroundImage: isSafeHttpUrl(establishment.imageEstablishment)
              ? `url(${JSON.stringify(establishment.imageEstablishment)})`
              : undefined,
            backgroundColor: "#102218",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lime">
            {establishment.organizationName || t("common.unknownVenue")}
          </p>
          <h1 className="font-display text-4xl text-bone sm:text-5xl">{establishment.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-mist">
            {location ? (
              <span className="inline-flex items-center gap-1.5">
                <ContactIcon name="pin" className="text-lime" />
                {location}
              </span>
            ) : null}
            <OpenNowBadge hours={establishment.openingHours} t={t} />
          </div>
          {fields.length > 0 ? (
            <a
              href="#canchas"
              className="inline-flex rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-flare"
            >
              {t("venue.courts")} ({fields.length})
            </a>
          ) : null}
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-10">
          {establishment.description ? (
            <Section title={t("venue.about")}>
              <p className="whitespace-pre-line leading-7 text-mist">{establishment.description}</p>
            </Section>
          ) : null}

          {establishment.amenities.length > 0 ? (
            <Section title={t("venue.services")}>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {establishment.amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-bone"
                  >
                    <AmenityIcon amenity={amenity} className="text-lime" />
                    {t(AMENITY_LABEL_KEYS[amenity])}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {establishment.galleryImages.length > 0 ? (
            <Section title={t("venue.gallery")}>
              <VenueGallery images={establishment.galleryImages} venueName={establishment.name} />
            </Section>
          ) : null}

          <Section title={t("venue.courts")} id="canchas">
            {fields.length === 0 ? (
              <EmptyState
                title={t("catalog.venueEmptyTitle")}
                description={t("catalog.venueEmptyDescription")}
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {fields.map((field) => (
                  <FieldCard key={field.id} field={field} />
                ))}
              </div>
            )}
          </Section>

          {establishment.policies ? (
            <Section title={t("venue.rules")}>
              <p className="whitespace-pre-line rounded-2xl border border-white/8 bg-white/3 p-5 text-sm leading-6 text-mist">
                {establishment.policies}
              </p>
            </Section>
          ) : null}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {contactLinks.length > 0 ? (
            <div className="space-y-3 rounded-[28px] border border-white/8 bg-pitch p-5">
              <h2 className="font-display text-lg text-bone">{t("venue.contact")}</h2>
              <ul className="space-y-1">
                {contactLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-white/5"
                    >
                      <span className="grid size-9 place-items-center rounded-full bg-lime/10 text-lime">
                        <ContactIcon name={link.icon} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-bone">{link.label}</span>
                        <span className="block truncate text-xs text-mist">{link.detail}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-3 rounded-[28px] border border-white/8 bg-pitch p-5">
            <h2 className="flex items-center gap-2 font-display text-lg text-bone">
              <ContactIcon name="clock" className="text-lime" />
              {t("venue.hours")}
            </h2>
            <VenueHoursTable hours={establishment.openingHours} t={t} />
          </div>

          {hasLocation(establishment) || directions ? (
            <div className="space-y-3 rounded-[28px] border border-white/8 bg-pitch p-5">
              <h2 className="flex items-center gap-2 font-display text-lg text-bone">
                <ContactIcon name="route" className="text-lime" />
                {t("venue.howToGetThere")}
              </h2>
              {hasLocation(establishment) ? (
                <VenueMap
                  ariaLabel={t("venue.mapLabel")}
                  className="h-56"
                  markers={[
                    {
                      id: establishment.establishmentId,
                      latitude: establishment.latitude,
                      longitude: establishment.longitude,
                      title: establishment.name,
                      subtitle: location,
                    },
                  ]}
                />
              ) : null}
              {location ? <p className="text-sm text-mist">{location}</p> : null}
              {directions ? (
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={directions.googleMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-bone transition hover:bg-white/10"
                  >
                    {t("venue.googleMaps")}
                  </a>
                  <a
                    href={directions.waze}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/12 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-bone transition hover:bg-white/10"
                  >
                    {t("venue.waze")}
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/**
 * Propósito: Carga sede, catálogo de canchas y permiso de visibilidad en paralelo.
 */
async function loadVenue(establishmentId: number) {
  const [{ t }, establishment, fieldCatalog] = await Promise.all([
    getTranslator(),
    getEstablishmentById(establishmentId),
    getVisibleFieldCatalog(),
    assertViewerCanSeeEstablishment(establishmentId),
  ]);
  /**
   * Output:
   * @returns object — Traductor, sede y sus canchas visibles
   */
  return {
    t,
    establishment,
    fields: filterFieldsByEstablishment(fieldCatalog, establishmentId),
  };
}
