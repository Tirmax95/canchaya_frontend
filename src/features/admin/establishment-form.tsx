"use client";

import { AMENITY_LABEL_KEYS, WEEK_DAY_LABEL_KEYS } from "@/core/i18n/label-keys";
import { useI18n } from "@/core/i18n/provider";
import {
  ESTABLISHMENT_AMENITIES,
  getProfileCompleteness,
  MAX_GALLERY_IMAGES,
  validateOpeningHours,
  WEEK_DAYS_MONDAY_FIRST,
  type Establishment,
  type EstablishmentAmenity,
  type GeoPoint,
  type OpeningHoursDay,
} from "@/domain/establishment";
import { AmenityIcon } from "@/features/catalog/venue-icons";
import { VenueMap } from "@/features/maps/venue-map";
import { cn } from "@/shared/lib/cn";
import { isSafeHttpUrl } from "@/shared/lib/url";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextAreaField, TextField } from "@/shared/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const DEFAULT_OPENS_AT = "06:00";
const DEFAULT_CLOSES_AT = "22:00";
const REVERSE_GEOCODE_DELAY_MS = 700;

interface GeocodingResult {
  label: string;
  latitude: number;
  longitude: number;
  city: string;
  address: string;
}

interface FormValues {
  name: string;
  description: string;
  address: string;
  city: string;
  location: GeoPoint | null;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  openingHours: OpeningHoursDay[];
  amenities: EstablishmentAmenity[];
  imageEstablishment: string;
  galleryImages: string[];
  policies: string;
  isActive: boolean;
}

const SECTION_IDS = {
  basics: "sede-basico",
  location: "sede-ubicacion",
  contact: "sede-contacto",
  hours: "sede-horario",
  amenities: "sede-servicios",
  media: "sede-fotos",
  policies: "sede-reglas",
} as const;

/**
 * Propósito: Semana completa con el mismo horario, para arrancar a editar.
 */
function buildDefaultWeek(): OpeningHoursDay[] {
  /**
   * Output:
   * @returns OpeningHoursDay[] — 7 días abiertos 06:00–22:00
   */
  return WEEK_DAYS_MONDAY_FIRST.map((day) => ({
    day,
    closed: false,
    opensAt: DEFAULT_OPENS_AT,
    closesAt: DEFAULT_CLOSES_AT,
  }));
}

/**
 * Propósito: Estado inicial del formulario a partir de la sede (o vacío al crear).
 */
function toFormValues(establishment?: Establishment): FormValues {
  /**
   * Output:
   * @returns FormValues — Valores editables
   */
  return {
    name: establishment?.name ?? "",
    description: establishment?.description ?? "",
    address: establishment?.address ?? "",
    city: establishment?.city ?? "",
    location:
      establishment && establishment.latitude !== null && establishment.longitude !== null
        ? { latitude: establishment.latitude, longitude: establishment.longitude }
        : null,
    phone: establishment?.phone ?? "",
    whatsapp: establishment?.whatsapp ?? "",
    email: establishment?.email ?? "",
    website: establishment?.website ?? "",
    instagram: establishment?.instagram ?? "",
    openingHours: establishment?.openingHours ?? [],
    amenities: establishment?.amenities ?? [],
    imageEstablishment: establishment?.imageEstablishment ?? "",
    galleryImages: establishment?.galleryImages ?? [],
    policies: establishment?.policies ?? "",
    isActive: establishment?.isActive ?? true,
  };
}

/**
 * Propósito: Crea o actualiza la ficha completa de una sede vía BFF (Zod en servidor y
 * class-validator en NestJS). Ubicación con búsqueda de dirección, mapa y GPS del navegador.
 */
export function EstablishmentForm({ establishment }: { establishment?: Establishment }) {
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => toFormValues(establishment));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(establishment);

  /**
   * Propósito: Actualiza un campo del formulario.
   */
  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const completeness = getProfileCompleteness({
    ...(establishment ?? ({} as Establishment)),
    ...values,
    latitude: values.location?.latitude ?? null,
    longitude: values.location?.longitude ?? null,
  });

  /**
   * Propósito: Envía el contrato snake_case que espera NestJS.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const hoursError = validateOpeningHours(values.openingHours);
    if (hoursError) {
      setError(t("venue.hoursInvalid"));
      document.getElementById(SECTION_IDS.hours)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setIsSubmitting(true);
    const body = {
      name: values.name,
      description: values.description,
      address: values.address,
      city: values.city,
      latitude: values.location?.latitude ?? null,
      longitude: values.location?.longitude ?? null,
      phone: values.phone,
      whatsapp: values.whatsapp,
      email: values.email,
      website: values.website,
      instagram: values.instagram,
      opening_hours: values.openingHours.map((entry) => ({
        day: entry.day,
        closed: entry.closed,
        opens_at: entry.closed ? null : entry.opensAt,
        closes_at: entry.closed ? null : entry.closesAt,
      })),
      amenities: values.amenities,
      image_establishment: values.imageEstablishment,
      gallery_images: values.galleryImages,
      policies: values.policies,
      is_active: values.isActive,
    };
    try {
      const response = await fetch(
        isEditing ? `/api/establishments/${establishment?.establishmentId}` : "/api/establishments",
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? t("admin.saveVenueFailed"));
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push("/admin/establecimientos");
      router.refresh();
    } catch {
      setError(t("admin.saveVenueFailed"));
      setIsSubmitting(false);
    }
  }

  const checklist: Array<{ label: string; done: boolean; target: string }> = [
    { label: t("venue.checklistDescription"), done: values.description.trim().length >= 20, target: SECTION_IDS.basics },
    { label: t("venue.checklistAddress"), done: Boolean(values.address && values.city), target: SECTION_IDS.location },
    { label: t("venue.checklistLocation"), done: values.location !== null, target: SECTION_IDS.location },
    { label: t("venue.checklistContact"), done: Boolean(values.phone || values.whatsapp), target: SECTION_IDS.contact },
    { label: t("venue.checklistHours"), done: values.openingHours.length > 0, target: SECTION_IDS.hours },
    { label: t("venue.checklistAmenities"), done: values.amenities.length > 0, target: SECTION_IDS.amenities },
    { label: t("venue.checklistCover"), done: isSafeHttpUrl(values.imageEstablishment), target: SECTION_IDS.media },
    { label: t("venue.checklistGallery"), done: values.galleryImages.length > 0, target: SECTION_IDS.media },
  ];

  /**
   * Output:
   * @returns JSX.Element — Formulario por secciones + resumen lateral
   */
  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        {error ? <Alert>{error}</Alert> : null}

        <FormSection id={SECTION_IDS.basics} title={t("venue.sectionBasics")} hint={t("venue.sectionBasicsHint")}>
          <TextField
            label={t("admin.tableName")}
            name="name"
            required
            maxLength={120}
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
          />
          <TextAreaField
            label={t("venue.description")}
            name="description"
            maxLength={1000}
            rows={4}
            placeholder={t("venue.descriptionPlaceholder")}
            value={values.description}
            onChange={(event) => setField("description", event.target.value)}
            hint={`${values.description.length}/1000`}
          />
        </FormSection>

        <FormSection id={SECTION_IDS.location} title={t("venue.sectionLocation")} hint={t("venue.sectionLocationHint")}>
          <LocationEditor values={values} setField={setField} />
        </FormSection>

        <FormSection id={SECTION_IDS.contact} title={t("venue.sectionContact")} hint={t("venue.sectionContactHint")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t("admin.formPhone")}
              name="phone"
              type="tel"
              maxLength={20}
              value={values.phone}
              onChange={(event) => setField("phone", event.target.value)}
            />
            <TextField
              label={t("venue.whatsapp")}
              name="whatsapp"
              type="tel"
              maxLength={20}
              placeholder="+573001234567"
              hint={t("venue.whatsappHint")}
              value={values.whatsapp}
              onChange={(event) => setField("whatsapp", event.target.value)}
            />
            <TextField
              label={t("venue.email")}
              name="email"
              type="email"
              maxLength={160}
              value={values.email}
              onChange={(event) => setField("email", event.target.value)}
            />
            <TextField
              label={t("venue.website")}
              name="website"
              type="url"
              maxLength={300}
              placeholder="https://"
              value={values.website}
              onChange={(event) => setField("website", event.target.value)}
            />
            <TextField
              label={t("venue.instagram")}
              name="instagram"
              maxLength={31}
              placeholder={t("venue.instagramPlaceholder")}
              value={values.instagram}
              onChange={(event) => setField("instagram", event.target.value)}
            />
          </div>
        </FormSection>

        <FormSection id={SECTION_IDS.hours} title={t("venue.sectionHours")} hint={t("venue.sectionHoursHint")}>
          <HoursEditor hours={values.openingHours} onChange={(hours) => setField("openingHours", hours)} />
        </FormSection>

        <FormSection id={SECTION_IDS.amenities} title={t("venue.sectionAmenities")} hint={t("venue.sectionAmenitiesHint")}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {ESTABLISHMENT_AMENITIES.map((amenity) => {
              const isChecked = values.amenities.includes(amenity);
              return (
                <label
                  key={amenity}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                    isChecked
                      ? "border-lime/50 bg-lime/10 text-bone"
                      : "border-white/10 text-mist hover:border-white/20 hover:text-bone",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isChecked}
                    onChange={() =>
                      setField(
                        "amenities",
                        isChecked
                          ? values.amenities.filter((item) => item !== amenity)
                          : ESTABLISHMENT_AMENITIES.filter(
                              (item) => item === amenity || values.amenities.includes(item),
                            ),
                      )
                    }
                  />
                  <AmenityIcon amenity={amenity} className={isChecked ? "text-lime" : undefined} />
                  <span className="flex-1">{t(AMENITY_LABEL_KEYS[amenity])}</span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "grid size-5 place-items-center rounded-md border text-[11px]",
                      isChecked ? "border-lime bg-lime text-ink" : "border-white/20",
                    )}
                  >
                    {isChecked ? "✓" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </FormSection>

        <FormSection
          id={SECTION_IDS.media}
          title={t("venue.sectionMedia")}
          hint={t("venue.sectionMediaHint", { max: MAX_GALLERY_IMAGES })}
        >
          <MediaEditor values={values} setField={setField} />
        </FormSection>

        <FormSection id={SECTION_IDS.policies} title={t("venue.sectionPolicies")} hint={t("venue.sectionPoliciesHint")}>
          <TextAreaField
            label={t("venue.policies")}
            name="policies"
            maxLength={1000}
            rows={4}
            placeholder={t("venue.policiesPlaceholder")}
            value={values.policies}
            onChange={(event) => setField("policies", event.target.value)}
            hint={`${values.policies.length}/1000`}
          />
        </FormSection>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="space-y-4 rounded-[28px] border border-white/8 bg-pitch p-5">
          <div>
            <p className="text-sm font-semibold text-bone">
              {t("venue.completeness", { percent: completeness })}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-lime transition-[width]"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-mist">{t("venue.completenessHint")}</p>
          </div>
          <nav aria-label={t("venue.sectionsNav")}>
            <ul className="space-y-1">
              {checklist.map((item) => (
                <li key={item.label}>
                  <a
                    href={`#${item.target}`}
                    className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm transition hover:bg-white/5"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-4 place-items-center rounded-full text-[10px]",
                        item.done ? "bg-lime text-ink" : "border border-white/20",
                      )}
                    >
                      {item.done ? "✓" : ""}
                    </span>
                    <span className={item.done ? "text-mist line-through decoration-white/20" : "text-bone"}>
                      {item.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="space-y-4 rounded-[28px] border border-white/8 bg-pitch p-5">
          <p className="text-sm font-semibold text-bone">{t("venue.sectionVisibility")}</p>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
            />
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition peer-focus-visible:ring-2 peer-focus-visible:ring-lime",
                values.isActive ? "bg-lime" : "bg-white/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-ink transition-[left]",
                  values.isActive ? "left-[22px]" : "left-0.5",
                )}
              />
            </span>
            <span className="space-y-1">
              <span className="block text-sm text-bone">
                {values.isActive ? t("venue.statusActive") : t("venue.statusInactive")}
              </span>
              <span className="block text-xs leading-5 text-mist">{t("venue.isActiveHint")}</span>
            </span>
          </label>
          <div className="flex flex-col gap-2">
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? t("admin.submitUpdateVenue") : t("admin.submitCreateVenue")}
            </Button>
            <Link
              href="/admin/establecimientos"
              className="rounded-full px-4 py-2 text-center text-sm text-mist transition hover:bg-white/5 hover:text-bone"
            >
              {t("venue.cancel")}
            </Link>
          </div>
        </div>
      </aside>
    </form>
  );
}

/**
 * Propósito: Tarjeta de sección del formulario con título y ayuda.
 */
function FormSection({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Fieldset con estilo de tarjeta
   */
  return (
    <fieldset id={id} className="scroll-mt-24 space-y-5 rounded-[28px] border border-white/8 bg-pitch p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div>
        <h2 className="font-display text-lg text-bone">{title}</h2>
        <p className="mt-1 text-sm text-mist">{hint}</p>
      </div>
      {children}
    </fieldset>
  );
}

/**
 * Propósito: Dirección, ciudad y punto en el mapa. Busca con Nominatim vía BFF, permite usar
 * el GPS del navegador y sugiere la dirección del punto marcado (geocodificación inversa).
 */
function LocationEditor({
  values,
  setField,
}: {
  values: FormValues;
  setField: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<GeocodingResult | null>(null);
  const reverseTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (reverseTimerRef.current) {
        window.clearTimeout(reverseTimerRef.current);
      }
    },
    [],
  );

  /**
   * Propósito: Busca la dirección escrita (o la del campo dirección + ciudad).
   */
  async function search() {
    const text = (query || [values.address, values.city].filter(Boolean).join(", ")).trim();
    if (text.length < 3) {
      return;
    }
    setIsSearching(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(text)}`);
      const payload = (await response.json().catch(() => ({}))) as {
        results?: GeocodingResult[];
        message?: string;
      };
      if (!response.ok) {
        setMessage(payload.message ?? t("venue.searchFailed"));
        setResults(null);
        return;
      }
      setResults(payload.results ?? []);
      if (!payload.results?.length) {
        setMessage(t("venue.noResults"));
      }
    } catch {
      setMessage(t("venue.searchFailed"));
    } finally {
      setIsSearching(false);
    }
    /**
     * Output:
     * Side effects — Lista de coincidencias o mensaje
     */
  }

  /**
   * Propósito: Aplica un resultado: mueve el pin y completa dirección/ciudad vacías.
   */
  function applyResult(result: GeocodingResult) {
    setField("location", { latitude: result.latitude, longitude: result.longitude });
    if (result.address && !values.address) {
      setField("address", result.address);
    }
    if (result.city && !values.city) {
      setField("city", result.city);
    }
    setResults(null);
    setSuggestion(null);
    setMessage(null);
  }

  /**
   * Propósito: Marca el punto y, con un pequeño retardo, consulta la dirección aproximada.
   */
  function pickPoint(point: GeoPoint) {
    setField("location", point);
    setSuggestion(null);
    if (reverseTimerRef.current) {
      window.clearTimeout(reverseTimerRef.current);
    }
    reverseTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?lat=${point.latitude}&lng=${point.longitude}`);
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { results?: GeocodingResult[] };
        const place = payload.results?.[0];
        if (place && (place.address || place.city)) {
          setSuggestion(place);
        }
      } catch {
        // La sugerencia es opcional: sin red, el pin queda igual.
      }
    }, REVERSE_GEOCODE_DELAY_MS);
  }

  /**
   * Propósito: Usa la ubicación del dispositivo (útil si el dueño está en la sede).
   */
  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setMessage(t("venue.locationDenied"));
      return;
    }
    setIsLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        pickPoint({
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
        });
      },
      () => {
        setIsLocating(false);
        setMessage(t("venue.locationDenied"));
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  /**
   * Output:
   * @returns JSX.Element — Campos de dirección + buscador + mapa
   */
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TextField
          label={t("admin.tableAddress")}
          name="address"
          required
          maxLength={180}
          value={values.address}
          onChange={(event) => setField("address", event.target.value)}
        />
        <TextField
          label={t("venue.city")}
          name="city"
          maxLength={80}
          placeholder={t("venue.cityPlaceholder")}
          value={values.city}
          onChange={(event) => setField("city", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-mist">{t("venue.searchAddress")}</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            aria-label={t("venue.searchAddress")}
            value={query}
            maxLength={200}
            placeholder={t("venue.searchPlaceholder")}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
            className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none transition placeholder:text-mist/50 focus:border-lime/70"
          />
          <Button type="button" variant="secondary" onClick={() => void search()} isLoading={isSearching}>
            {isSearching ? t("venue.searching") : t("venue.search")}
          </Button>
          <Button type="button" variant="ghost" onClick={useMyLocation} isLoading={isLocating}>
            {isLocating ? t("venue.locating") : t("venue.useMyLocation")}
          </Button>
        </div>
        {results && results.length > 0 ? (
          <ul className="overflow-hidden rounded-2xl border border-white/10 bg-ink/60">
            {results.map((result) => (
              <li key={`${result.latitude},${result.longitude}`} className="border-t border-white/5 first:border-t-0">
                <button
                  type="button"
                  onClick={() => applyResult(result)}
                  className="w-full px-4 py-3 text-left text-sm text-bone transition hover:bg-white/5"
                >
                  {result.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {message ? <p className="text-sm text-clay">{message}</p> : null}
      </div>

      <VenueMap
        ariaLabel={t("venue.pickerMapLabel")}
        className="h-80"
        value={values.location}
        onPick={pickPoint}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {values.location ? (
          <span className="text-mist">
            {t("venue.coordinates")}:{" "}
            <span className="tabular-nums text-bone">
              {values.location.latitude.toFixed(6)}, {values.location.longitude.toFixed(6)}
            </span>
          </span>
        ) : (
          <span className="text-mist">{t("venue.noLocation")}</span>
        )}
        {values.location ? (
          <button
            type="button"
            onClick={() => {
              setField("location", null);
              setSuggestion(null);
            }}
            className="text-sm text-danger hover:underline"
          >
            {t("venue.clearLocation")}
          </button>
        ) : null}
      </div>

      {suggestion ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime/20 bg-lime/5 px-4 py-3 text-sm">
          <span className="text-mist">
            {t("venue.suggestedAddress", {
              address: [suggestion.address, suggestion.city].filter(Boolean).join(", "),
            })}
          </span>
          <button
            type="button"
            className="font-semibold text-lime hover:underline"
            onClick={() => {
              if (suggestion.address) {
                setField("address", suggestion.address);
              }
              if (suggestion.city) {
                setField("city", suggestion.city);
              }
              setSuggestion(null);
            }}
          >
            {t("venue.useSuggestedAddress")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Propósito: Horario semanal (lunes primero) con días cerrados y copia rápida del lunes.
 */
function HoursEditor({
  hours,
  onChange,
}: {
  hours: OpeningHoursDay[];
  onChange: (hours: OpeningHoursDay[]) => void;
}) {
  const { t } = useI18n();
  const hoursError = validateOpeningHours(hours);

  if (hours.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Horario desactivado
     */
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-white/15 px-4 py-4">
        <p className="text-sm text-mist">{t("venue.hoursDisabled")}</p>
        <Button type="button" variant="secondary" onClick={() => onChange(buildDefaultWeek())}>
          {t("venue.enableHours")}
        </Button>
      </div>
    );
  }

  /**
   * Propósito: Cambia una propiedad del día indicado (lo crea si faltaba).
   */
  function updateDay(day: number, patch: Partial<OpeningHoursDay>) {
    const existing = hours.find((entry) => entry.day === day) ?? {
      day,
      closed: false,
      opensAt: DEFAULT_OPENS_AT,
      closesAt: DEFAULT_CLOSES_AT,
    };
    const next = { ...existing, ...patch };
    if (!next.closed) {
      next.opensAt = next.opensAt ?? DEFAULT_OPENS_AT;
      next.closesAt = next.closesAt ?? DEFAULT_CLOSES_AT;
    }
    onChange([...hours.filter((entry) => entry.day !== day), next]);
  }

  /**
   * Propósito: Replica el horario del lunes en los demás días.
   */
  function copyMondayToAll() {
    const monday = hours.find((entry) => entry.day === 1);
    if (!monday) {
      return;
    }
    onChange(WEEK_DAYS_MONDAY_FIRST.map((day) => ({ ...monday, day })));
  }

  /**
   * Output:
   * @returns JSX.Element — Filas por día + acciones
   */
  return (
    <div className="space-y-3">
      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10">
        {WEEK_DAYS_MONDAY_FIRST.map((day) => {
          const entry = hours.find((item) => item.day === day);
          const isClosed = entry?.closed ?? true;
          const dayLabel = t(WEEK_DAY_LABEL_KEYS[day]);
          return (
            <div key={day} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-24 text-sm font-medium text-bone">{dayLabel}</span>
              <label className="flex items-center gap-2 text-sm text-mist">
                <input
                  type="checkbox"
                  className="size-4 accent-lime"
                  checked={!isClosed}
                  onChange={(event) => updateDay(day, { closed: !event.target.checked })}
                />
                {isClosed ? t("venue.closed") : t("venue.open")}
              </label>
              {!isClosed ? (
                <div className="ml-auto flex items-center gap-2 text-sm">
                  <input
                    type="time"
                    aria-label={`${dayLabel} – ${t("venue.opensAt")}`}
                    value={entry?.opensAt ?? DEFAULT_OPENS_AT}
                    onChange={(event) => updateDay(day, { opensAt: event.target.value })}
                    className="rounded-xl border border-white/10 bg-ink/40 px-3 py-2 text-bone [color-scheme:dark] focus:border-lime/70 focus:outline-none"
                  />
                  <span className="text-mist">–</span>
                  <input
                    type="time"
                    aria-label={`${dayLabel} – ${t("venue.closesAt")}`}
                    value={entry?.closesAt === "24:00" ? "23:59" : (entry?.closesAt ?? DEFAULT_CLOSES_AT)}
                    onChange={(event) => updateDay(day, { closesAt: event.target.value })}
                    className="rounded-xl border border-white/10 bg-ink/40 px-3 py-2 text-bone [color-scheme:dark] focus:border-lime/70 focus:outline-none"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {hoursError ? <p className="text-sm text-danger">{t("venue.hoursInvalid")}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={copyMondayToAll}>
          {t("venue.copyToAll")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => onChange([])}>
          {t("venue.clearHours")}
        </Button>
      </div>
    </div>
  );
}

/**
 * Propósito: Portada y galería por URL con vista previa.
 */
function MediaEditor({
  values,
  setField,
}: {
  values: FormValues;
  setField: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
}) {
  const { t } = useI18n();
  const [draftUrl, setDraftUrl] = useState("");
  const canAdd =
    values.galleryImages.length < MAX_GALLERY_IMAGES &&
    draftUrl.trim().startsWith("https://") &&
    isSafeHttpUrl(draftUrl.trim()) &&
    !values.galleryImages.includes(draftUrl.trim());

  /**
   * Propósito: Agrega la URL escrita a la galería.
   */
  function addImage() {
    if (!canAdd) {
      return;
    }
    setField("galleryImages", [...values.galleryImages, draftUrl.trim()]);
    setDraftUrl("");
  }

  /**
   * Output:
   * @returns JSX.Element — Portada + galería editable
   */
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-end">
        <TextField
          label={t("venue.coverImage")}
          name="image_establishment"
          type="url"
          required
          maxLength={500}
          placeholder="https://..."
          value={values.imageEstablishment}
          onChange={(event) => setField("imageEstablishment", event.target.value)}
        />
        <ImagePreview url={values.imageEstablishment} className="h-28" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-mist">{t("venue.gallery")}</span>
          <span className="text-xs text-mist">
            {t("venue.galleryCount", { count: values.galleryImages.length, max: MAX_GALLERY_IMAGES })}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            aria-label={t("venue.galleryImage")}
            placeholder="https://..."
            maxLength={500}
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addImage();
              }
            }}
            className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none transition placeholder:text-mist/50 focus:border-lime/70"
          />
          <Button type="button" variant="secondary" onClick={addImage} disabled={!canAdd}>
            {t("venue.addPhoto")}
          </Button>
        </div>
        {values.galleryImages.length === 0 ? (
          <p className="text-sm text-mist/70">{t("venue.galleryEmpty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {values.galleryImages.map((url) => (
              <li key={url} className="group relative">
                <ImagePreview url={url} className="aspect-[4/3]" />
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      "galleryImages",
                      values.galleryImages.filter((item) => item !== url),
                    )
                  }
                  className="absolute right-2 top-2 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-semibold text-danger opacity-90 transition hover:opacity-100"
                >
                  {t("venue.removePhoto")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Propósito: Miniatura de una URL de imagen; muestra un recuadro vacío si no es segura.
 */
function ImagePreview({ url, className }: { url: string; className?: string }) {
  /**
   * Output:
   * @returns JSX.Element — Imagen o placeholder
   */
  return isSafeHttpUrl(url) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      referrerPolicy="no-referrer"
      className={cn("w-full rounded-2xl border border-white/10 object-cover", className)}
    />
  ) : (
    <div className={cn("w-full rounded-2xl border border-dashed border-white/15 bg-ink/30", className)} />
  );
}
