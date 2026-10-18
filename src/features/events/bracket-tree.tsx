"use client";

import { useI18n } from "@/core/i18n/provider";
import type { TranslateFn } from "@/core/i18n/translate";
import type { BracketTree, TreeMatch, TreeSlot } from "@/domain/bracket";
import { getKnockoutRoundKey } from "@/domain/events";
import { cn } from "@/shared/lib/cn";
import { formatDateTime } from "@/shared/lib/datetime";
import { useEffect, useRef, useState } from "react";

/** Alto reservado por partido de la ronda más poblada de cada mitad. */
const SLOT_HEIGHT_PX = 112;
const LINE = "bg-white/15";

type Side = "left" | "right";

/**
 * Propósito: Nombre de una ronda de llave (Final, Semifinales, Cuartos…).
 */
function roundTitle(t: TranslateFn, round: number, totalRounds: number): string {
  const key = getKnockoutRoundKey(round, totalRounds);
  /**
   * Output:
   * @returns string — Título de la ronda
   */
  return key ? t(`events.${key}`) : t("events.roundKnockout", { round });
}

/**
 * Propósito: Texto de un cupo: equipo, "1° Grupo A", "Ganador CF 2", "Pasa directo"…
 */
function slotText(
  t: TranslateFn,
  slot: TreeSlot,
  totalRounds: number,
): { primary: string; secondary: string | null; isPlaceholder: boolean } {
  switch (slot.kind) {
    case "team":
      return {
        primary: slot.name,
        secondary: slot.seed
          ? `${t("events.bracketSeed", { place: slot.seed.place, group: slot.seed.group })}${
              slot.isProvisional ? ` · ${t("events.bracketProvisional")}` : ""
            }`
          : null,
        isPlaceholder: false,
      };
    case "seed":
      return {
        primary: t("events.bracketSeed", { place: slot.place, group: slot.group }),
        secondary: null,
        isPlaceholder: true,
      };
    case "winner":
    case "loser":
      return {
        primary: t(slot.kind === "winner" ? "events.bracketWinnerOf" : "events.bracketLoserOf", {
          round: roundTitle(t, slot.round, totalRounds),
          number: slot.matchNumber,
        }),
        secondary: null,
        isPlaceholder: true,
      };
    case "bye":
      return { primary: t("events.bracketBye"), secondary: null, isPlaceholder: true };
    default:
      return { primary: t("events.bracketTbd"), secondary: null, isPlaceholder: true };
  }
  /**
   * Output:
   * @returns object — Texto principal, secundario y si es un cupo por definir
   */
}

/**
 * Propósito: Caja de un partido del árbol (dos filas y, si hay, fecha y cancha).
 */
function MatchBox({
  match,
  totalRounds,
  highlight = false,
}: {
  match: TreeMatch;
  totalRounds: number;
  highlight?: boolean;
}) {
  const { t, intlLocale } = useI18n();
  if (match.isBye) {
    const advancing = slotText(t, match.home.kind === "bye" ? match.away : match.home, totalRounds);
    /**
     * Output:
     * @returns JSX.Element — Pase directo (sin partido)
     */
    return (
      <div className="w-full rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs text-mist/70">
        <p className="truncate text-bone/80">{advancing.primary}</p>
        <p>{t("events.bracketBye")}</p>
      </div>
    );
  }
  const rows = [
    { key: "home", slot: match.home, score: match.homeScore, penalties: match.homePenalties, isWinner: match.winner === "home" },
    { key: "away", slot: match.away, score: match.awayScore, penalties: match.awayPenalties, isWinner: match.winner === "away" },
  ];
  const meta = [match.startsAt ? formatDateTime(match.startsAt, intlLocale) : null, match.fieldName]
    .filter(Boolean)
    .join(" · ");
  /**
   * Output:
   * @returns JSX.Element — Partido
   */
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border bg-ink/60 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.8)]",
        highlight ? "border-lime/40" : "border-white/10",
      )}
    >
      {rows.map((row) => {
        const text = slotText(t, row.slot, totalRounds);
        return (
          <div
            key={row.key}
            className={cn(
              "flex items-center justify-between gap-2 px-3 py-1.5 first:border-b first:border-white/5",
              row.isWinner ? "bg-lime/10" : "",
            )}
          >
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate text-[13px]",
                  text.isPlaceholder ? "italic text-mist/60" : row.isWinner ? "font-semibold text-bone" : "text-bone/85",
                )}
                title={text.primary}
              >
                {text.primary}
              </span>
              {text.secondary ? (
                <span className="block truncate text-[10px] uppercase tracking-wide text-lime/70">
                  {text.secondary}
                </span>
              ) : null}
            </span>
            <span className={cn("shrink-0 text-sm tabular-nums", row.isWinner ? "font-bold text-lime" : "text-mist")}>
              {row.score ?? ""}
              {row.penalties !== null && row.penalties !== undefined ? (
                <span className="ml-0.5 text-[10px] text-mist">({row.penalties})</span>
              ) : null}
            </span>
          </div>
        );
      })}
      {meta ? <p className="truncate border-t border-white/5 px-3 py-1 text-[10px] text-mist/70">{meta}</p> : null}
    </div>
  );
}

/**
 * Propósito: Columna de una ronda con sus conectores. En la mitad izquierda las líneas salen
 * hacia la derecha; en la derecha, hacia la izquierda (cuadro en espejo).
 */
function RoundColumn({
  matches,
  side,
  totalRounds,
  hasIncoming,
  hasOutgoing,
}: {
  matches: TreeMatch[];
  side: Side;
  totalRounds: number;
  hasIncoming: boolean;
  hasOutgoing: boolean;
}) {
  const pairs: TreeMatch[][] = [];
  for (let index = 0; index < matches.length; index += 2) {
    pairs.push(matches.slice(index, index + 2));
  }
  // Hacia la final (salida) y desde la ronda anterior (entrada), según la mitad del cuadro.
  const outgoingEdge = side === "left" ? "-right-3" : "-left-3";
  const incomingEdge = side === "left" ? "-left-3" : "-right-3";
  /**
   * Output:
   * @returns JSX.Element — Columna de partidos centrados con líneas del árbol
   */
  return (
    <div className="flex h-full w-52 shrink-0 flex-col">
      {pairs.map((pair) => (
        <div key={pair[0].key} className="relative flex flex-1 flex-col">
          {pair.map((match) => (
            <div key={match.key} className="relative flex flex-1 items-center">
              {hasIncoming ? (
                <span aria-hidden className={cn("absolute top-1/2 h-px w-3", LINE, incomingEdge)} />
              ) : null}
              {hasOutgoing ? (
                <span aria-hidden className={cn("absolute top-1/2 h-px w-3", LINE, outgoingEdge)} />
              ) : null}
              <MatchBox match={match} totalRounds={totalRounds} />
            </div>
          ))}
          {hasOutgoing && pair.length === 2 ? (
            <span aria-hidden className={cn("absolute top-1/4 h-1/2 w-px", LINE, outgoingEdge)} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Propósito: Tarjeta del campeón (o "por definir").
 */
function ChampionCard({ champion }: { champion: string | null }) {
  const { t } = useI18n();
  /**
   * Output:
   * @returns JSX.Element — Trofeo y nombre
   */
  return (
    <div
      className={cn(
        "flex w-52 flex-col items-center gap-1 rounded-2xl border px-4 py-3 text-center",
        champion ? "border-lime/50 bg-lime/10" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <svg aria-hidden viewBox="0 0 24 24" className={cn("h-7 w-7", champion ? "text-lime" : "text-mist/50")} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8m-4-4v4m-5-17h10v5a5 5 0 0 1-10 0V4Zm0 2H4v2a3 3 0 0 0 3 3m10-5h3v2a3 3 0 0 1-3 3" />
      </svg>
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-lime">{t("events.champion")}</p>
      <p className={cn("font-display text-lg", champion ? "text-bone" : "italic text-mist/60")}>
        {champion ?? t("events.bracketTbd")}
      </p>
    </div>
  );
}

/**
 * Propósito: Fila de títulos de ronda alineada con las columnas.
 */
function TitlesRow({ titles }: { titles: string[] }) {
  /**
   * Output:
   * @returns JSX.Element — Títulos
   */
  return (
    <div className="flex gap-6">
      {titles.map((title, index) => (
        <p key={`${title}-${index}`} className="w-52 shrink-0 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-lime">
          {title}
        </p>
      ))}
    </div>
  );
}

const COLUMN_WIDTH_PX = 208;
const COLUMN_GAP_PX = 24;

/**
 * Propósito: Ancho que necesita el cuadro en espejo (rondas a cada lado + la final).
 */
function mirroredWidth(totalRounds: number): number {
  const columns = 2 * (totalRounds - 1) + 1;
  /**
   * Output:
   * @returns number — Píxeles
   */
  return columns * COLUMN_WIDTH_PX + (columns - 1) * COLUMN_GAP_PX;
}

/**
 * Propósito: Cuadro en espejo: dos mitades que llegan a la final en el centro.
 */
function MirroredBracket({ tree, titles }: { tree: BracketTree; titles: string[] }) {
  const { rounds, totalRounds } = tree;
  const final = rounds[totalRounds - 1][0];
  // Mínimo 3 cupos de alto: deja espacio al trofeo sobre la final.
  const height = Math.max(rounds[0].length / 2, 3) * SLOT_HEIGHT_PX;
  const halves = rounds.slice(0, totalRounds - 1).map((roundMatches) => ({
    left: roundMatches.slice(0, roundMatches.length / 2),
    right: roundMatches.slice(roundMatches.length / 2),
  }));
  /**
   * Output:
   * @returns JSX.Element — Cuadro en espejo
   */
  return (
    <div className="mx-auto w-max space-y-3">
      <TitlesRow titles={[...titles.slice(0, -1), titles[titles.length - 1], ...titles.slice(0, -1).reverse()]} />
      <div className="flex items-stretch gap-6" style={{ height }}>
        {halves.map((half, index) => (
          <RoundColumn
            key={`left-${index}`}
            matches={half.left}
            side="left"
            totalRounds={totalRounds}
            hasIncoming={index > 0}
            hasOutgoing
          />
        ))}
        <div className="relative flex w-52 shrink-0 items-center">
          {totalRounds > 1 ? (
            <>
              <span aria-hidden className={cn("absolute -left-3 top-1/2 h-px w-3", LINE)} />
              <span aria-hidden className={cn("absolute -right-3 top-1/2 h-px w-3", LINE)} />
            </>
          ) : null}
          {/* La final queda en el centro exacto (donde llegan las líneas); el trofeo encima. */}
          <div className="relative w-full">
            <div className="absolute bottom-full left-0 right-0 mb-4 flex justify-center">
              <ChampionCard champion={tree.champion} />
            </div>
            <MatchBox match={final} totalRounds={totalRounds} highlight />
          </div>
        </div>
        {[...halves].reverse().map((half, index) => (
          <RoundColumn
            key={`right-${index}`}
            matches={half.right}
            side="right"
            totalRounds={totalRounds}
            hasIncoming={index < halves.length - 1}
            hasOutgoing
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Propósito: Cuadro lineal de izquierda a derecha, para contenedores angostos.
 */
function LinearBracket({ tree, titles }: { tree: BracketTree; titles: string[] }) {
  const { t } = useI18n();
  const { rounds, totalRounds } = tree;
  const height = Math.max(rounds[0].length, 2) * SLOT_HEIGHT_PX;
  /**
   * Output:
   * @returns JSX.Element — Cuadro lineal con el campeón al final
   */
  return (
    <div className="w-max space-y-3">
      <TitlesRow titles={[...titles, t("events.champion")]} />
      <div className="flex items-stretch gap-6" style={{ height }}>
        {rounds.map((roundMatches, index) => (
          <RoundColumn
            key={`linear-${index}`}
            matches={roundMatches}
            side="left"
            totalRounds={totalRounds}
            hasIncoming={index > 0}
            hasOutgoing={index < rounds.length - 1}
          />
        ))}
        <div className="flex w-52 shrink-0 items-center">
          <ChampionCard champion={tree.champion} />
        </div>
      </div>
    </div>
  );
}

/**
 * Propósito: Cuadro de eliminatorias como en las competencias profesionales. Usa el diseño
 * en espejo si cabe en el ancho disponible y el lineal si no; "Pantalla completa" abre el
 * espejo en grande. Tercer puesto aparte.
 */
export function BracketTreeView({ tree }: { tree: BracketTree }) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { rounds, totalRounds } = tree;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  if (!rounds[totalRounds - 1]?.[0]) {
    return null;
  }
  const titles = rounds.map((_, index) => roundTitle(t, index + 1, totalRounds));
  const fitsMirrored = totalRounds > 1 && availableWidth >= mirroredWidth(totalRounds);

  /**
   * Output:
   * @returns JSX.Element — Cuadro, botón de pantalla completa y tercer puesto
   */
  return (
    <div className="space-y-4">
      {totalRounds > 1 ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-bone transition hover:bg-white/[0.06]"
          >
            <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M3 8V3h5M17 8V3h-5M3 12v5h5M17 12v5h-5" />
            </svg>
            {t("events.bracketFullscreen")}
          </button>
        </div>
      ) : null}
      <div ref={containerRef} className="overflow-x-auto pb-2">
        {fitsMirrored ? (
          <MirroredBracket tree={tree} titles={titles} />
        ) : (
          <LinearBracket tree={tree} titles={titles} />
        )}
      </div>
      {tree.thirdPlace ? (
        <div className="w-52 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-lime">{t("events.thirdPlaceMatch")}</p>
          <MatchBox match={tree.thirdPlace} totalRounds={totalRounds} />
        </div>
      ) : null}
      {isFullscreen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("events.tabBracket")}
          className="fixed inset-0 z-50 overflow-auto bg-ink p-6"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="font-display text-2xl text-bone">{t("events.tabBracket")}</p>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="rounded-full border border-white/12 px-4 py-2 text-sm text-bone hover:bg-white/[0.06]"
            >
              {t("events.bracketClose")}
            </button>
          </div>
          <div className="flex min-h-[calc(100%-5rem)] items-center">
            <MirroredBracket tree={tree} titles={titles} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
