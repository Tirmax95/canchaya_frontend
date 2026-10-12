"use client";

import { isStaff } from "@/core/auth/roles";
import {
  INBOX_STATUS_KEYS,
  INBOX_WINDOW_KEYS,
  translateMappedLabel,
} from "@/core/i18n/label-keys";
import { useI18n } from "@/core/i18n/provider";
import type { TranslateFn } from "@/core/i18n/translate";
import {
  INBOX_STATUS_FILTERS,
  INBOX_WINDOW_FILTERS,
  buildReservationInbox,
  parseInboxStatusFilter,
  parseInboxTenantKey,
  parseInboxWindowFilter,
  reservationTenantKey,
  type InboxStatusFilter,
  type InboxWindowFilter,
  type ReservationDayGroup,
  type ReservationTenantGroup,
  type ReservationTenantOption,
} from "@/domain/reservation-inbox";
import type { ReservationView } from "@/domain/reservation";
import type { ClientSessionUser } from "@/domain/user";
import { formatHourOfDay, toLocalHourOfDay } from "@/domain/venue-occupancy";
import { useReservationActions } from "@/features/booking/use-reservation-actions";
import { cn } from "@/shared/lib/cn";
import { formatDayHeading } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { StatusBadge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  useId,
  useMemo,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";

const BOARD_PATH = "/admin/reservas";
const CONTROL_CLASS_NAME =
  "h-9 w-full rounded-xl border border-white/10 bg-ink/50 px-3 text-sm text-bone outline-none transition placeholder:text-mist/50 focus:border-lime/70";

const STATUS_RAIL: Record<ReservationView["status"], string> = {
  pending: "bg-clay",
  confirmed: "bg-lime",
  completed: "bg-mist/40",
  cancelled: "bg-danger/70",
};

interface FilterOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Propósito: Agenda de staff agrupada por tenant y día, con filtros densos en una sola barra.
 */
export function StaffReservationBoard({
  reservations,
  user,
  initialTenantKey = "all",
}: {
  reservations: ReservationView[];
  user: ClientSessionUser;
  initialTenantKey?: string;
}) {
  const { t, intlLocale } = useI18n();
  const { pendingId, error, confirmationDialog, requestReservationChange } =
    useReservationActions();
  const [now] = useState(() => new Date());
  const [tenantKey, setTenantKey] = useState(() => parseInboxTenantKey(initialTenantKey));
  const [status, setStatus] = useState<InboxStatusFilter>("actionable");
  const [windowFilter, setWindowFilter] = useState<InboxWindowFilter>("upcoming");
  const [query, setQuery] = useState("");
  const [fieldId, setFieldId] = useState<number | null>(null);
  const knownTenantKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const reservation of reservations) keys.add(reservationTenantKey(reservation));
    /**
     * Output:
     * @returns Set<string> — Claves de tenant presentes en el inventario
     */
    return keys;
  }, [reservations]);
  const resolvedTenantKey = tenantKey !== "all" && !knownTenantKeys.has(tenantKey) ? "all" : tenantKey;
  const inbox = useMemo(
    () =>
      buildReservationInbox(
        reservations,
        { tenantKey: resolvedTenantKey, status, window: windowFilter, query, fieldId },
        now,
      ),
    [reservations, resolvedTenantKey, status, windowFilter, query, fieldId, now],
  );
  const tenantOptions = useMemo(
    () => buildTenantOptions(inbox.tenants, reservations.length, t),
    [inbox.tenants, reservations.length, t],
  );
  const showTenantPicker = tenantOptions.length > 2;
  const showTenantHeadings = resolvedTenantKey === "all" && inbox.groups.length > 1;
  const canMutate = isStaff(user) && !user.isReadOnly;

  /**
   * Propósito: Cambia el tenant, limpia la cancha y deja la URL compartible.
   * Usa history.replaceState para no remountar el tablero ni perder el resto de filtros.
   */
  function selectTenant(nextKey: string) {
    const nextTenantKey = parseInboxTenantKey(nextKey);
    setTenantKey(nextTenantKey);
    setFieldId(null);
    const href =
      nextTenantKey === "all"
        ? BOARD_PATH
        : `${BOARD_PATH}?tenant=${encodeURIComponent(nextTenantKey)}`;
    window.history.replaceState(null, "", href);
    /**
     * Output:
     * Side effects — Recorta el tablero al tenant y sincroniza ?tenant=
     */
  }

  if (reservations.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Vacío real, sin inventario
     */
    return (
      <EmptyState
        title={t("booking.inboxEmptyTitle")}
        description={t("booking.inboxEmptyDescription")}
      />
    );
  }

  /**
   * Output:
   * @returns JSX.Element — Barra de filtros + agenda
   */
  return (
    <div className="space-y-4">
      {confirmationDialog}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="rounded-2xl border border-white/8 bg-pitch/70 p-3">
        <div className="flex flex-wrap gap-2">
          {showTenantPicker ? (
            <div className="min-w-[14rem] flex-[1.4]">
              <FilterCombobox
                label={t("booking.filterTenant")}
                value={resolvedTenantKey}
                options={tenantOptions}
                placeholder={t("booking.searchTenant")}
                noMatchesLabel={t("booking.noMatches")}
                onChange={selectTenant}
              />
            </div>
          ) : null}
          <div className="w-[9rem] shrink-0">
            <FilterSelect
              label={t("booking.filterStatus")}
              value={status}
              options={INBOX_STATUS_FILTERS.map((value) => ({
                value,
                label: translateMappedLabel(t, INBOX_STATUS_KEYS, value),
              }))}
              onChange={(value) => setStatus(parseInboxStatusFilter(value))}
            />
          </div>
          <div className="w-[9rem] shrink-0">
            <FilterSelect
              label={t("booking.filterWhen")}
              value={windowFilter}
              options={INBOX_WINDOW_FILTERS.map((value) => ({
                value,
                label: translateMappedLabel(t, INBOX_WINDOW_KEYS, value),
              }))}
              onChange={(value) => setWindowFilter(parseInboxWindowFilter(value))}
            />
          </div>
          {inbox.fields.length > 1 ? (
            <div className="w-[9rem] shrink-0">
              <FilterSelect
                label={t("booking.filterCourt")}
                value={fieldId ? String(fieldId) : ""}
                options={[
                  { value: "", label: t("common.all") },
                  ...inbox.fields.map((field) => ({
                    value: String(field.fieldId),
                    label: field.fieldName,
                  })),
                ]}
                onChange={(value) => {
                  const nextFieldId = Number(value);
                  setFieldId(Number.isInteger(nextFieldId) && nextFieldId > 0 ? nextFieldId : null);
                }}
              />
            </div>
          ) : null}
          <div className="min-w-[12rem] flex-1">
            <label className="block min-w-0">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">
                {t("booking.filterSearch")}
              </span>
              <input
                value={query}
                maxLength={80}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("booking.searchInbox")}
                className={CONTROL_CLASS_NAME}
              />
            </label>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/6 pt-2.5 text-xs">
          <StatTrigger
            label={t("booking.statPending")}
            value={String(inbox.summary.pending)}
            isActive={status === "pending"}
            tone={inbox.summary.pending > 0 ? "warning" : "neutral"}
            onClick={() => setStatus(status === "pending" ? "actionable" : "pending")}
          />
          <StatTrigger
            label={t("booking.statToday")}
            value={String(inbox.summary.today)}
            isActive={windowFilter === "today"}
            onClick={() => setWindowFilter(windowFilter === "today" ? "upcoming" : "today")}
          />
          <StatTrigger
            label={t("booking.statUpcoming")}
            value={String(inbox.summary.confirmedUpcoming)}
            isActive={status === "confirmed"}
            tone="positive"
            onClick={() => setStatus(status === "confirmed" ? "actionable" : "confirmed")}
          />
          <StatTrigger
            label={t("booking.statCancelled")}
            value={String(inbox.summary.cancelled)}
            isActive={status === "cancelled"}
            tone={inbox.summary.cancelled > 0 ? "danger" : "neutral"}
            onClick={() => {
              if (status === "cancelled") {
                setStatus("actionable");
                setWindowFilter("upcoming");
                return;
              }
              setStatus("cancelled");
              setWindowFilter("all");
            }}
          />
          <p className="ml-auto text-mist">
            {inbox.visibleCount === 1
              ? t("booking.reservationOne", { count: inbox.visibleCount })
              : t("booking.reservationMany", { count: inbox.visibleCount })}
            {inbox.hiddenCancelledCount > 0
              ? t("booking.hiddenCount", { count: inbox.hiddenCancelledCount })
              : ""}
            {inbox.summary.activeRevenue > 0
              ? ` · ${formatMoney(inbox.summary.activeRevenue, intlLocale, t("common.consult"))}`
              : ""}
          </p>
        </div>
      </div>

      {inbox.visibleCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
          <p className="text-sm text-bone">{t("booking.noFilterResults")}</p>
          <p className="mt-1 text-xs text-mist">
            {emptyFilterDescription(inbox.hiddenCancelledCount, inbox.summary.total, t)}
          </p>
          {inbox.hiddenCancelledCount > 0 ? (
            <button
              type="button"
              className="mt-3 text-xs text-lime hover:underline"
              onClick={() => {
                setStatus("cancelled");
                setWindowFilter("all");
              }}
            >
              {t("booking.seeCancelled", { count: inbox.hiddenCancelledCount })}
            </button>
          ) : (
            <button
              type="button"
              className="mt-3 text-xs text-lime hover:underline"
              onClick={() => {
                setStatus("all");
                setWindowFilter("all");
                setQuery("");
                setFieldId(null);
              }}
            >
              {t("booking.clearFilters")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {inbox.groups.map((group) => (
            <TenantAgenda
              key={group.key}
              group={group}
              showHeading={showTenantHeadings}
              pendingId={pendingId}
              canMutate={canMutate}
              showEstablishment={group.establishmentNames.length > 1}
              onChange={requestReservationChange}
              t={t}
              intlLocale={intlLocale}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Propósito: Opciones del autocomplete de tenant, con "todos" primero.
 */
function buildTenantOptions(
  tenants: ReservationTenantOption[],
  totalCount: number,
  t: TranslateFn,
): FilterOption[] {
  /**
   * Output:
   * @returns FilterOption[] — Lista para el combobox
   */
  return [
    { value: "all", label: t("booking.allTenants"), hint: `${totalCount}` },
    ...tenants.map((tenant) => ({
      value: tenant.key,
      label: tenant.label,
      hint: tenantDetail(tenant, t),
    })),
  ];
}

/**
 * Propósito: Subtítulo del tenant: sedes extra y conteo, sin repetir el nombre.
 */
function tenantDetail(tenant: ReservationTenantOption, t: TranslateFn): string {
  const extraVenues = tenant.establishmentNames.filter((name) => name !== tenant.label);
  const venueLabel =
    extraVenues.length > 1
      ? t("booking.venueCount", { count: extraVenues.length })
      : extraVenues[0];
  const countLabel =
    tenant.pendingCount > 0
      ? t("booking.pendingShort", { count: tenant.pendingCount })
      : `${tenant.totalCount}`;
  /**
   * Output:
   * @returns string — Hint corto del option
   */
  return venueLabel ? `${venueLabel} · ${countLabel}` : countLabel;
}

/**
 * Propósito: Copy del vacío filtrado, con pista de canceladas ocultas.
 */
function emptyFilterDescription(
  hiddenCancelledCount: number,
  tenantTotal: number,
  t: TranslateFn,
): string {
  if (hiddenCancelledCount > 0) {
    /**
     * Output:
     * @returns string — Hay canceladas detrás del filtro Activas
     */
    return t("booking.hiddenCancelledHint", { count: hiddenCancelledCount });
  }
  /**
   * Output:
   * @returns string — El recorte no dejó filas
   */
  return tenantTotal > 0 ? t("booking.emptyFilterHint") : t("booking.emptyTenantHint");
}

/**
 * Propósito: Autocomplete de tenant: escribe para filtrar, elige solo valores de la allowlist.
 */
function FilterCombobox({
  label,
  value,
  options,
  placeholder,
  noMatchesLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  placeholder: string;
  noMatchesLabel: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.value === value);
  const needle = draft.trim().toLowerCase().slice(0, 80);
  const visibleOptions = needle
    ? options.filter((option) =>
        `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(needle),
      )
    : options;

  /**
   * Propósito: Confirma una opción solo si está en el catálogo (evita valores inventados).
   */
  function choose(nextValue: string) {
    const match = options.find((option) => option.value === nextValue);
    if (!match) {
      /**
       * Output:
       * Side effects — Ignora valores que no están en la allowlist
       */
      return;
    }
    onChange(match.value);
    setIsOpen(false);
    setDraft("");
    /**
     * Output:
     * Side effects — Aplica el filtro y cierra la lista
     */
  }

  /**
   * Propósito: Cierra la lista al salir del control, no al mover el foco a un option.
   */
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) {
      /**
       * Output:
       * Side effects — El foco sigue dentro del combobox
       */
      return;
    }
    setIsOpen(false);
    setDraft("");
    /**
     * Output:
     * Side effects — Cierra sin cambiar la selección
     */
  }

  /**
   * Propósito: Navegación de teclado del listbox (flechas, enter, escape).
   */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(visibleOptions.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const active = visibleOptions[activeIndex];
      if (active) choose(active.value);
      return;
    }
    if (event.key === "Escape") {
      setIsOpen(false);
      setDraft("");
    }
    /**
     * Output:
     * Side effects — Mueve el highlight o confirma/cierra
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Combobox accesible
   */
  return (
    <div className="relative min-w-0" onBlur={handleBlur}>
      <label className="block min-w-0" htmlFor={inputId}>
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">
          {label}
        </span>
        <span className="relative block">
          <input
            id={inputId}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            value={isOpen ? draft : (selected?.label ?? "")}
            placeholder={placeholder}
            maxLength={80}
            onFocus={() => {
              setIsOpen(true);
              setDraft("");
              setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
            }}
            onChange={(event) => {
              setDraft(event.target.value);
              setIsOpen(true);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className={cn(CONTROL_CLASS_NAME, "pr-8")}
          />
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-mist" aria-hidden>
            ▾
          </span>
        </span>
      </label>
      {isOpen ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink py-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
        >
          {visibleOptions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-mist">{noMatchesLabel}</li>
          ) : (
            visibleOptions.map((option, index) => (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm",
                    index === activeIndex ? "bg-lime/15 text-bone" : "text-bone hover:bg-white/6",
                    option.value === value ? "text-lime" : "",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  {option.hint ? <span className="shrink-0 text-[11px] text-mist">{option.hint}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Propósito: Select compacto para filtros de pocas opciones (estado, día, cancha).
 */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  /**
   * Output:
   * @returns JSX.Element — Select de filtro
   */
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">
        {label}
      </span>
      <select
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROL_CLASS_NAME, "pr-7")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-ink">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Propósito: Atajo de KPI en una línea, sin tarjetas grandes.
 */
function StatTrigger({
  label,
  value,
  isActive,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: string;
  isActive: boolean;
  tone?: "neutral" | "warning" | "positive" | "danger";
  onClick: () => void;
}) {
  /**
   * Output:
   * @returns JSX.Element — Métrica clicable
   */
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-0.5 transition",
        isActive ? "bg-lime/15 text-lime" : "text-mist hover:text-bone",
      )}
    >
      <span
        className={cn(
          "mr-1 font-display text-sm",
          tone === "warning"
            ? "text-clay"
            : tone === "positive"
              ? "text-lime"
              : tone === "danger"
                ? "text-danger"
                : "text-bone",
        )}
      >
        {value}
      </span>
      {label}
    </button>
  );
}

/**
 * Propósito: Bloque de un tenant: encabezado opcional y días de la agenda.
 */
function TenantAgenda({
  group,
  showHeading,
  pendingId,
  canMutate,
  showEstablishment,
  onChange,
  t,
  intlLocale,
}: {
  group: ReservationTenantGroup;
  showHeading: boolean;
  pendingId: number | null;
  canMutate: boolean;
  showEstablishment: boolean;
  onChange: (reservationId: number, action: "confirm" | "cancel") => void;
  t: TranslateFn;
  intlLocale: string;
}) {
  /**
   * Output:
   * @returns JSX.Element — Agenda del tenant
   */
  return (
    <section className="space-y-3">
      {showHeading ? (
        <header className="flex items-baseline justify-between gap-2 border-b border-white/8 pb-1.5">
          <h2 className="font-display text-lg text-bone">{group.label}</h2>
          <p className="text-[11px] text-mist">
            {group.totalCount} · {t("booking.pendingShort", { count: group.pendingCount })}
          </p>
        </header>
      ) : null}
      {group.dayGroups.map((dayGroup) => (
        <DayAgenda
          key={dayGroup.dayKey}
          dayGroup={dayGroup}
          pendingId={pendingId}
          canMutate={canMutate}
          showEstablishment={showEstablishment}
          onChange={onChange}
          t={t}
          intlLocale={intlLocale}
        />
      ))}
    </section>
  );
}

/**
 * Propósito: Un día de la agenda con riel de fecha y filas compactas.
 */
function DayAgenda({
  dayGroup,
  pendingId,
  canMutate,
  showEstablishment,
  onChange,
  t,
  intlLocale,
}: {
  dayGroup: ReservationDayGroup;
  pendingId: number | null;
  canMutate: boolean;
  showEstablishment: boolean;
  onChange: (reservationId: number, action: "confirm" | "cancel") => void;
  t: TranslateFn;
  intlLocale: string;
}) {
  /**
   * Output:
   * @returns JSX.Element — Día con fixtures
   */
  return (
    <div className="grid gap-2 md:grid-cols-[9.5rem_1fr] md:gap-4">
      <h3 className="pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-mist md:sticky md:top-24 md:self-start">
        {formatDayHeading(dayGroup.dayKey, intlLocale)}
      </h3>
      <ul className="divide-y divide-white/6 overflow-hidden rounded-2xl border border-white/8 bg-ink/30">
        {dayGroup.reservations.map((reservation) => (
          <FixtureRow
            key={reservation.reservationId}
            reservation={reservation}
            isBusy={pendingId === reservation.reservationId}
            canMutate={canMutate}
            showEstablishment={showEstablishment}
            onChange={onChange}
            t={t}
            intlLocale={intlLocale}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Propósito: Fila compacta de un partido: hora, cancha, jugador y acciones.
 */
function FixtureRow({
  reservation,
  isBusy,
  canMutate,
  showEstablishment,
  onChange,
  t,
  intlLocale,
}: {
  reservation: ReservationView;
  isBusy: boolean;
  canMutate: boolean;
  showEstablishment: boolean;
  onChange: (reservationId: number, action: "confirm" | "cancel") => void;
  t: TranslateFn;
  intlLocale: string;
}) {
  const canCancel =
    reservation.status === "pending" || reservation.status === "confirmed";
  const canConfirm = canMutate && reservation.status === "pending";
  const isCancelled = reservation.status === "cancelled";
  /**
   * Output:
   * @returns JSX.Element — Fila de reserva
   */
  return (
    <li
      className={cn(
        "flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:gap-3",
        isCancelled ? "opacity-55" : "",
      )}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 52px" }}
    >
      <span
        className={cn("hidden h-7 w-0.5 shrink-0 rounded-full sm:block", STATUS_RAIL[reservation.status])}
        aria-hidden
      />
      <p className="w-[7.5rem] shrink-0 whitespace-nowrap text-sm tabular-nums text-bone">
        {formatHourOfDay(toLocalHourOfDay(reservation.startTime))}
        <span className="text-mist"> – </span>
        {formatHourOfDay(toLocalHourOfDay(reservation.endTime))}
      </p>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-bone">
          {reservation.fieldName}
          {showEstablishment ? (
            <span className="text-mist"> · {reservation.establishmentName}</span>
          ) : null}
        </p>
        <p className="truncate text-[11px] text-mist">
          {t("booking.playerNumber", { id: reservation.userId })}
          {reservation.notes ? ` · ${reservation.notes}` : ""}
        </p>
      </div>
      <p className="shrink-0 text-sm tabular-nums text-bone">
        {formatMoney(reservation.priceEstimate, intlLocale, t("common.consult"))}
      </p>
      <StatusBadge status={reservation.status} />
      {canMutate && (canConfirm || canCancel) ? (
        <div className="flex shrink-0 gap-1.5">
          {canConfirm ? (
            <Button
              variant="primary"
              className="px-3 py-1 text-xs"
              isLoading={isBusy}
              onClick={() => onChange(reservation.reservationId, "confirm")}
            >
              {t("booking.confirm")}
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              variant="danger"
              className="px-3 py-1 text-xs"
              isLoading={isBusy}
              onClick={() => onChange(reservation.reservationId, "cancel")}
            >
              {t("booking.cancel")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
