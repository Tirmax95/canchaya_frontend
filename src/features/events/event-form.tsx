"use client";

import {
  EVENT_FORMAT_HINT_KEYS,
  EVENT_FORMAT_KEYS,
  EVENT_SPORT_KEYS,
} from "@/core/i18n/label-keys";
import { useI18n } from "@/core/i18n/provider";
import {
  DEFAULT_EVENT_SETTINGS,
  EVENT_FORMATS,
  EVENT_LIMITS,
  EVENT_SPORTS,
  type EventFormat,
  type EventSettings,
  type EventSport,
  type EventSummary,
} from "@/domain/events";
import { cn } from "@/shared/lib/cn";
import { isSafeHttpUrl } from "@/shared/lib/url";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextAreaField, TextField } from "@/shared/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FormValues {
  establishmentId: number | null;
  name: string;
  description: string;
  sport: EventSport;
  format: EventFormat;
  startsOn: string;
  endsOn: string;
  registrationClosesAt: string;
  minTeams: number;
  maxTeams: number;
  minPlayers: number;
  maxPlayers: string;
  entryFee: number;
  requiresApproval: boolean;
  settings: EventSettings;
  prizes: string;
  rules: string;
  coverImage: string;
}

/**
 * Propósito: `datetime-local` (hora del navegador) a partir de un ISO, y viceversa.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  /**
   * Output:
   * @returns string — "YYYY-MM-DDTHH:mm"
   */
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/**
 * Propósito: Valores iniciales del formulario.
 */
function toFormValues(event: EventSummary | undefined, venues: Array<{ establishmentId: number }>): FormValues {
  /**
   * Output:
   * @returns FormValues — Editables
   */
  return {
    establishmentId: event?.establishmentId ?? venues[0]?.establishmentId ?? null,
    name: event?.name ?? "",
    description: event?.description ?? "",
    sport: event?.sport ?? "football_5",
    format: event?.format ?? "knockout",
    startsOn: event?.startsOn ?? "",
    endsOn: event?.endsOn ?? "",
    registrationClosesAt: toLocalInput(event?.registrationClosesAt ?? null),
    minTeams: event?.minTeams ?? 4,
    maxTeams: event?.maxTeams ?? 8,
    minPlayers: event?.minPlayersPerTeam ?? 5,
    maxPlayers: event?.maxPlayersPerTeam ? String(event.maxPlayersPerTeam) : "",
    entryFee: event ? Math.round(event.entryFeeCents / 100) : 0,
    requiresApproval: event?.requiresApproval ?? false,
    settings: event?.settings ?? DEFAULT_EVENT_SETTINGS,
    prizes: event?.prizes ?? "",
    rules: event?.rules ?? "",
    coverImage: event?.coverImage ?? "",
  };
}

/**
 * Propósito: Crear o editar un evento. Cuando ya inició, la estructura (formato, cupos,
 * valor) queda bloqueada y solo se envían textos e imagen.
 */
export function EventForm({
  venues,
  event,
}: {
  venues: Array<{ establishmentId: number; name: string }>;
  event?: EventSummary;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => toFormValues(event, venues));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLocked =
    Boolean(event?.fixtureGeneratedAt) ||
    (event !== undefined && !["draft", "registration_open", "registration_closed"].includes(event.status));

  /**
   * Propósito: Cambia un campo.
   */
  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  /**
   * Propósito: Cambia una opción de competencia.
   */
  function setSetting<K extends keyof EventSettings>(key: K, value: EventSettings[K]) {
    setValues((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  /**
   * Propósito: Arma el contrato snake_case y lo envía al BFF.
   */
  async function handleSubmit(submitEvent: React.FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setError(null);
    const content = {
      name: values.name.trim(),
      description: values.description.trim(),
      prizes: values.prizes.trim(),
      rules: values.rules.trim(),
      cover_image: values.coverImage.trim(),
      ends_on: values.endsOn || null,
      registration_closes_at: values.registrationClosesAt
        ? new Date(values.registrationClosesAt).toISOString()
        : null,
    };
    const structure = {
      establishment_id: values.establishmentId ?? undefined,
      sport: values.sport,
      format: values.format,
      starts_on: values.startsOn,
      min_teams: values.minTeams,
      max_teams: values.maxTeams,
      min_players_per_team: values.minPlayers,
      max_players_per_team: values.maxPlayers ? Number(values.maxPlayers) : null,
      entry_fee: values.entryFee,
      requires_approval: values.requiresApproval,
      settings: {
        points_win: values.settings.pointsWin,
        points_draw: values.settings.pointsDraw,
        points_loss: values.settings.pointsLoss,
        double_round: values.settings.doubleRound,
        group_count: values.settings.groupCount,
        qualifiers_per_group: values.settings.qualifiersPerGroup,
        third_place_match: values.settings.thirdPlaceMatch,
        match_duration_minutes: values.settings.matchDurationMinutes,
      },
    };
    setIsSubmitting(true);
    try {
      const response = await fetch(event ? `/api/events/${event.eventId}` : "/api/events", {
        method: event ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isLocked ? content : { ...content, ...structure }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        event?: { eventId: number };
      };
      if (!response.ok) {
        setError(payload.message ?? t("events.formSaveFailed"));
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const eventId = event?.eventId ?? payload.event?.eventId;
      router.push(eventId ? `/admin/eventos/${eventId}` : "/admin/eventos");
      router.refresh();
    } catch {
      setError(t("events.formSaveFailed"));
      setIsSubmitting(false);
    }
  }

  if (venues.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Sin sedes
     */
    return (
      <Alert tone="info">
        {t("events.formNoVenues")}{" "}
        <Link href="/admin/establecimientos/nuevo" className="underline">
          {t("admin.newVenue")}
        </Link>
      </Alert>
    );
  }

  const numberInput = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    min: number,
    max: number,
    disabled = isLocked,
  ) => (
    <TextField
      label={label}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : ""}
      disabled={disabled}
      onChange={(changeEvent) => onChange(Math.trunc(Number(changeEvent.target.value)))}
    />
  );

  /**
   * Output:
   * @returns JSX.Element — Formulario por secciones
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Alert>{error}</Alert> : null}
      {isLocked ? <Alert tone="info">{t("events.formLockedHint")}</Alert> : null}

      <Section title={t("events.formSectionBasics")}>
        <TextField
          label={t("events.formName")}
          required
          minLength={3}
          maxLength={120}
          placeholder={t("events.formNamePlaceholder")}
          value={values.name}
          onChange={(changeEvent) => setField("name", changeEvent.target.value)}
        />
        <TextAreaField
          label={t("events.formDescription")}
          maxLength={4000}
          rows={4}
          value={values.description}
          onChange={(changeEvent) => setField("description", changeEvent.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={t("events.formVenue")}
            value={String(values.establishmentId ?? "")}
            disabled={isLocked}
            onChange={(value) => setField("establishmentId", Number(value))}
            options={venues.map((venue) => ({ value: String(venue.establishmentId), label: venue.name }))}
          />
          <SelectField
            label={t("events.formSport")}
            value={values.sport}
            disabled={isLocked}
            onChange={(value) => setField("sport", value as EventSport)}
            options={EVENT_SPORTS.map((sport) => ({ value: sport, label: t(EVENT_SPORT_KEYS[sport]) }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("events.formStartsOn")}
            type="date"
            required
            disabled={isLocked}
            value={values.startsOn}
            onChange={(changeEvent) => setField("startsOn", changeEvent.target.value)}
            className="[color-scheme:dark]"
          />
          <TextField
            label={t("events.formEndsOn")}
            type="date"
            min={values.startsOn || undefined}
            value={values.endsOn}
            onChange={(changeEvent) => setField("endsOn", changeEvent.target.value)}
            className="[color-scheme:dark]"
          />
        </div>
      </Section>

      <Section title={t("events.formSectionCompetition")}>
        <div className="grid gap-3 sm:grid-cols-2">
          {EVENT_FORMATS.map((format) => (
            <label
              key={format}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 transition",
                values.format === format ? "border-lime/60 bg-lime/10" : "border-white/10 hover:border-white/20",
                isLocked && "cursor-not-allowed opacity-60",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="format"
                  value={format}
                  checked={values.format === format}
                  disabled={isLocked}
                  onChange={() => setField("format", format)}
                  className="accent-lime"
                />
                <span className="font-semibold text-bone">{t(EVENT_FORMAT_KEYS[format])}</span>
              </span>
              <span className="pl-6 text-xs leading-5 text-mist">{t(EVENT_FORMAT_HINT_KEYS[format])}</span>
            </label>
          ))}
        </div>

        {values.format === "league" || values.format === "groups_knockout" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {numberInput(t("events.formPointsWin"), values.settings.pointsWin, (value) => setSetting("pointsWin", value), 0, 10)}
            {numberInput(t("events.formPointsDraw"), values.settings.pointsDraw, (value) => setSetting("pointsDraw", value), 0, 10)}
            {numberInput(t("events.formPointsLoss"), values.settings.pointsLoss, (value) => setSetting("pointsLoss", value), 0, 10)}
          </div>
        ) : null}
        {values.format === "groups_knockout" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {numberInput(t("events.formGroupCount"), values.settings.groupCount, (value) => setSetting("groupCount", value), 1, EVENT_LIMITS.maxGroups)}
            {numberInput(t("events.formQualifiers"), values.settings.qualifiersPerGroup, (value) => setSetting("qualifiersPerGroup", value), 1, 8)}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {values.format === "league" || values.format === "groups_knockout" ? (
            <CheckboxField
              label={t("events.formDoubleRound")}
              checked={values.settings.doubleRound}
              disabled={isLocked}
              onChange={(checked) => setSetting("doubleRound", checked)}
            />
          ) : null}
          {values.format === "knockout" || values.format === "groups_knockout" ? (
            <CheckboxField
              label={t("events.formThirdPlace")}
              checked={values.settings.thirdPlaceMatch}
              disabled={isLocked}
              onChange={(checked) => setSetting("thirdPlaceMatch", checked)}
            />
          ) : null}
        </div>
        {values.format !== "open" ? (
          <div className="sm:w-1/2">
            {numberInput(
              t("events.formMatchDuration"),
              values.settings.matchDurationMinutes,
              (value) => setSetting("matchDurationMinutes", value),
              EVENT_LIMITS.minMatchMinutes,
              EVENT_LIMITS.maxMatchMinutes,
            )}
          </div>
        ) : null}
      </Section>

      <Section title={t("events.formSectionRegistration")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {numberInput(t("events.formMinTeams"), values.minTeams, (value) => setField("minTeams", value), EVENT_LIMITS.minTeams, EVENT_LIMITS.maxTeams)}
          {numberInput(t("events.formMaxTeams"), values.maxTeams, (value) => setField("maxTeams", value), EVENT_LIMITS.minTeams, EVENT_LIMITS.maxTeams)}
          {numberInput(t("events.formMinPlayers"), values.minPlayers, (value) => setField("minPlayers", value), 1, EVENT_LIMITS.maxPlayersPerTeam)}
          <TextField
            label={t("events.formMaxPlayers")}
            type="number"
            inputMode="numeric"
            min={values.minPlayers}
            max={EVENT_LIMITS.maxPlayersPerTeam}
            disabled={isLocked}
            value={values.maxPlayers}
            onChange={(changeEvent) => setField("maxPlayers", changeEvent.target.value)}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t("events.formEntryFee")}
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            max={EVENT_LIMITS.maxEntryFeePesos}
            disabled={isLocked}
            value={values.entryFee}
            hint={t("events.formEntryFeeHint")}
            onChange={(changeEvent) => setField("entryFee", Math.max(0, Math.trunc(Number(changeEvent.target.value))))}
          />
          <TextField
            label={t("events.formRegistrationClosesAt")}
            type="datetime-local"
            value={values.registrationClosesAt}
            onChange={(changeEvent) => setField("registrationClosesAt", changeEvent.target.value)}
            className="[color-scheme:dark]"
          />
        </div>
        <CheckboxField
          label={t("events.formRequiresApproval")}
          checked={values.requiresApproval}
          disabled={isLocked}
          onChange={(checked) => setField("requiresApproval", checked)}
        />
      </Section>

      <Section title={t("events.formSectionContent")}>
        <TextAreaField
          label={t("events.formPrizes")}
          maxLength={2000}
          rows={3}
          placeholder={t("events.formPrizesPlaceholder")}
          value={values.prizes}
          onChange={(changeEvent) => setField("prizes", changeEvent.target.value)}
        />
        <TextAreaField
          label={t("events.formRules")}
          maxLength={4000}
          rows={5}
          placeholder={t("events.formRulesPlaceholder")}
          value={values.rules}
          onChange={(changeEvent) => setField("rules", changeEvent.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-end">
          <TextField
            label={t("events.formCover")}
            type="url"
            maxLength={500}
            placeholder="https://..."
            value={values.coverImage}
            onChange={(changeEvent) => setField("coverImage", changeEvent.target.value)}
          />
          {isSafeHttpUrl(values.coverImage) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={values.coverImage} alt="" referrerPolicy="no-referrer" className="h-28 w-full rounded-2xl border border-white/10 object-cover" />
          ) : (
            <div className="h-28 w-full rounded-2xl border border-dashed border-white/15 bg-ink/30" />
          )}
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {event ? t("events.formSave") : t("events.formCreate")}
        </Button>
        <Link
          href={event ? `/admin/eventos/${event.eventId}` : "/admin/eventos"}
          className="rounded-full px-4 py-2 text-sm text-mist transition hover:bg-white/5 hover:text-bone"
        >
          {t("venue.cancel")}
        </Link>
      </div>
    </form>
  );
}

/**
 * Propósito: Tarjeta de sección del formulario.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  /**
   * Output:
   * @returns JSX.Element — Fieldset con estilo de tarjeta
   */
  return (
    <fieldset className="space-y-5 rounded-[28px] border border-white/8 bg-pitch p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="font-display text-lg text-bone">{title}</h2>
      {children}
    </fieldset>
  );
}

/**
 * Propósito: Select con el estilo de los campos del design system.
 */
function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  /**
   * Output:
   * @returns JSX.Element — Select etiquetado
   */
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-mist">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none focus:border-lime/70 disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Propósito: Casilla con etiqueta.
 */
function CheckboxField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  /**
   * Output:
   * @returns JSX.Element — Checkbox
   */
  return (
    <label className={cn("flex items-center gap-2 text-sm text-bone", disabled && "opacity-60")}>
      <input
        type="checkbox"
        className="size-4 accent-lime"
        checked={checked}
        disabled={disabled}
        onChange={(changeEvent) => onChange(changeEvent.target.checked)}
      />
      {label}
    </label>
  );
}
