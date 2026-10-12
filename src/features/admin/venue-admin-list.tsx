"use client";

import { useI18n } from "@/core/i18n/provider";
import {
  getProfileCompleteness,
  hasLocation,
  type EstablishmentCatalogItem,
} from "@/domain/establishment";
import { DeleteButton } from "@/features/admin/delete-button";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/money";
import { SafeImage } from "@/shared/ui/safe-image";
import Link from "next/link";
import { useState } from "react";

/**
 * Propósito: Listado de sedes del panel con búsqueda local, estado de publicación, ficha
 * completada y acciones. Recibe el catálogo ya cargado en servidor (una sola carga).
 */
export function VenueAdminList({ venues }: { venues: EstablishmentCatalogItem[] }) {
  const { t, intlLocale } = useI18n();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredVenues = normalizedQuery
    ? venues.filter((venue) =>
        `${venue.name} ${venue.city} ${venue.address} ${venue.organizationName ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : venues;

  /**
   * Output:
   * @returns JSX.Element — Buscador + tarjetas
   */
  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("venue.adminSearch")}
        aria-label={t("venue.adminSearch")}
        className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none transition placeholder:text-mist/50 focus:border-lime/70 sm:max-w-md"
      />
      {filteredVenues.length === 0 ? (
        <p className="rounded-2xl border border-white/8 px-4 py-6 text-center text-sm text-mist">
          {t("venue.adminNoMatches")}
        </p>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {filteredVenues.map((venue) => {
            const completeness = getProfileCompleteness(venue);
            const location = [venue.address, venue.city].filter(Boolean).join(", ");
            return (
              <li
                key={venue.establishmentId}
                className="flex flex-col overflow-hidden rounded-[24px] border border-white/8 bg-pitch sm:flex-row"
              >
                <SafeImage
                  src={venue.imageEstablishment}
                  alt={venue.name}
                  fallbackLabel={venue.name.slice(0, 2).toUpperCase()}
                  className="h-40 w-full shrink-0 sm:h-auto sm:w-44"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      {venue.organizationName ? (
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lime">
                          {venue.organizationName}
                        </p>
                      ) : null}
                      <h3 className="truncate font-display text-xl text-bone">{venue.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                          venue.isActive ? "bg-lime/15 text-lime" : "bg-white/10 text-mist",
                        )}
                      >
                        {venue.isActive ? t("venue.statusActive") : t("venue.statusInactive")}
                      </span>
                      {!hasLocation(venue) ? (
                        <span className="rounded-full bg-clay/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-clay">
                          {t("venue.noLocationBadge")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-mist">{location || t("catalog.addressPending")}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mist">
                    <span>
                      {venue.fieldCount === 1
                        ? t("venue.oneCourt")
                        : t("venue.courtsCount", { count: venue.fieldCount })}
                    </span>
                    {venue.minPricePerHour !== null ? (
                      <span>
                        {t("venue.priceFrom", {
                          price: formatMoney(venue.minPricePerHour, intlLocale, t("common.consult")),
                        })}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-mist">
                      <span>{t("venue.completeness", { percent: completeness })}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          completeness >= 80 ? "bg-lime" : completeness >= 50 ? "bg-clay" : "bg-danger",
                        )}
                        style={{ width: `${completeness}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <Link
                      href={`/admin/establecimientos/${venue.establishmentId}`}
                      className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink transition hover:bg-flare"
                    >
                      {t("common.edit")}
                    </Link>
                    {venue.isActive ? (
                      <Link
                        href={`/establecimientos/${venue.establishmentId}`}
                        className="rounded-full border border-white/12 px-4 py-2 text-sm text-bone transition hover:bg-white/5"
                      >
                        {t("venue.viewPublic")}
                      </Link>
                    ) : null}
                    <div className="ml-auto">
                      <DeleteButton
                        href={`/api/establishments/${venue.establishmentId}`}
                        label={venue.name}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
