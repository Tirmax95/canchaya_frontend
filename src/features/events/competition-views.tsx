"use client";

import { useI18n } from "@/core/i18n/provider";
import type { TranslateFn } from "@/core/i18n/translate";
import {
  buildBracketColumns,
  formatScore,
  getKnockoutRoundKey,
  groupMatchesByRound,
  isMatchPlayed,
  type EventMatch,
  type StandingsTable,
} from "@/domain/events";
import { formatEventDateTime } from "@/features/events/event-format";
import { cn } from "@/shared/lib/cn";

/**
 * Propósito: Título de un bloque de partidos (fecha de liga, grupo o ronda de llave).
 */
export function getRoundTitle(
  t: TranslateFn,
  block: { stage: EventMatch["stage"]; groupLabel: string | null; round: number },
  totalKnockoutRounds: number,
): string {
  if (block.stage === "group") {
    /**
     * Output:
     * @returns string — "Grupo A · Fecha 2"
     */
    return `${t("events.group", { group: block.groupLabel ?? "" })} · ${t("events.round", { round: block.round })}`;
  }
  if (block.stage === "knockout") {
    const key = getKnockoutRoundKey(block.round, totalKnockoutRounds);
    /**
     * Output:
     * @returns string — "Semifinales" o "Ronda 1"
     */
    return key ? t(`events.${key}`) : t("events.roundKnockout", { round: block.round });
  }
  /**
   * Output:
   * @returns string — "Fecha 3"
   */
  return t("events.round", { round: block.round });
}

/**
 * Propósito: Número de rondas de la llave (para nombrar final, semis, cuartos).
 */
export function countKnockoutRounds(matches: EventMatch[]): number {
  /**
   * Output:
   * @returns number — Ronda máxima de eliminatoria
   */
  return matches
    .filter((match) => match.stage === "knockout")
    .reduce((max, match) => Math.max(max, match.round), 0);
}

/**
 * Propósito: Fila de partido de solo lectura: equipos, marcador, cancha y hora.
 */
export function MatchRow({ match, actions }: { match: EventMatch; actions?: React.ReactNode }) {
  const { t, intlLocale } = useI18n();
  const score = formatScore(match);
  const homeWon = match.winnerRegistrationId !== null && match.winnerRegistrationId === match.homeRegistrationId;
  const awayWon = match.winnerRegistrationId !== null && match.winnerRegistrationId === match.awayRegistrationId;
  /**
   * Output:
   * @returns JSX.Element — Partido
   */
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-ink/30 px-4 py-3 sm:flex-row sm:items-center">
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
        <span className={cn("truncate text-right", homeWon ? "font-semibold text-bone" : "text-mist")}>
          {match.homeTeamName ?? t("events.toBeDefined")}
        </span>
        <span className="min-w-20 rounded-lg bg-white/5 px-2 py-1 text-center font-display tabular-nums text-bone">
          {score ?? t("events.vs")}
          {match.status === "walkover" ? (
            <span className="ml-1 text-[10px] text-clay">{t("events.walkover")}</span>
          ) : null}
        </span>
        <span className={cn("truncate", awayWon ? "font-semibold text-bone" : "text-mist")}>
          {match.awayTeamName ?? t("events.toBeDefined")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-mist sm:w-64 sm:justify-end">
        {match.startsAt ? (
          <span>
            {formatEventDateTime(match.startsAt, intlLocale)}
            {match.fieldName ? ` · ${match.fieldName}` : ""}
          </span>
        ) : !isMatchPlayed(match) ? (
          <span className="text-mist/60">{t("events.notScheduled")}</span>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

/**
 * Propósito: Fixture agrupado por fase, grupo y fecha (solo lectura).
 */
export function FixtureView({ matches }: { matches: EventMatch[] }) {
  const { t } = useI18n();
  const totalKnockoutRounds = countKnockoutRounds(matches);
  if (matches.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Vacío
     */
    return <p className="text-sm text-mist">{t("events.fixtureEmpty")}</p>;
  }
  /**
   * Output:
   * @returns JSX.Element — Bloques de partidos
   */
  return (
    <div className="space-y-6">
      {groupMatchesByRound(matches).map((block) => (
        <section key={block.key} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">
            {getRoundTitle(t, block, totalKnockoutRounds)}
          </h3>
          {block.matches.map((match) => (
            <MatchRow
              key={match.matchId}
              match={match}
              actions={
                match.isThirdPlace ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase">
                    {t("events.thirdPlaceMatch")}
                  </span>
                ) : null
              }
            />
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * Propósito: Tablas de posiciones (liga o grupos) con racha y clasificados resaltados.
 */
export function StandingsView({
  tables,
  qualifiersPerGroup,
}: {
  tables: StandingsTable[];
  qualifiersPerGroup?: number;
}) {
  const { t } = useI18n();
  const hasRows = tables.some((table) => table.rows.length > 0);
  if (!hasRows) {
    /**
     * Output:
     * @returns JSX.Element — Vacío
     */
    return <p className="text-sm text-mist">{t("events.standingsEmpty")}</p>;
  }
  const columns = [
    t("events.colPlayed"),
    t("events.colWon"),
    t("events.colDrawn"),
    t("events.colLost"),
    t("events.colGoalsFor"),
    t("events.colGoalsAgainst"),
    t("events.colGoalDiff"),
  ];
  /**
   * Output:
   * @returns JSX.Element — Tablas
   */
  return (
    <div className="space-y-6">
      {tables.map((table) => (
        <section key={table.groupLabel ?? "league"} className="space-y-2">
          {table.groupLabel ? (
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">
              {t("events.group", { group: table.groupLabel })}
            </h3>
          ) : null}
          <div className="overflow-x-auto rounded-2xl border border-white/8">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-white/4 text-xs text-mist">
                <tr>
                  <th className="w-10 px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">{t("events.colTeam")}</th>
                  {columns.map((column) => (
                    <th key={column} className="px-2 py-2 text-center font-medium">
                      {column}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold text-bone">{t("events.colPoints")}</th>
                  <th className="hidden px-3 py-2 text-left font-medium md:table-cell">{t("events.colForm")}</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, index) => {
                  const qualifies =
                    qualifiersPerGroup !== undefined && table.groupLabel !== null && index < qualifiersPerGroup;
                  return (
                    <tr key={row.registrationId} className="border-t border-white/5">
                      <td className="px-3 py-2 text-mist">
                        <span
                          className={cn(
                            "inline-grid size-6 place-items-center rounded-full text-xs",
                            qualifies ? "bg-lime text-ink" : index === 0 && !table.groupLabel ? "bg-lime/20 text-lime" : "",
                          )}
                          title={qualifies ? t("events.qualifies") : undefined}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-bone">{row.teamName}</td>
                      {[row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst].map(
                        (value, valueIndex) => (
                          <td key={valueIndex} className="px-2 py-2 text-center tabular-nums text-mist">
                            {value}
                          </td>
                        ),
                      )}
                      <td className="px-2 py-2 text-center tabular-nums text-mist">
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </td>
                      <td className="px-3 py-2 text-center font-display tabular-nums text-bone">{row.points}</td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <div className="flex gap-1">
                          {row.form.map((result, formIndex) => (
                            <span
                              key={formIndex}
                              className={cn(
                                "grid size-5 place-items-center rounded text-[10px] font-bold",
                                result === "W"
                                  ? "bg-lime/20 text-lime"
                                  : result === "L"
                                    ? "bg-danger/20 text-danger"
                                    : "bg-white/10 text-mist",
                              )}
                            >
                              {result}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * Propósito: Cuadro de llaves por columnas (ronda) con ganador resaltado y tercer puesto.
 */
export function BracketView({ matches }: { matches: EventMatch[] }) {
  const { t } = useI18n();
  const columns = buildBracketColumns(matches);
  const thirdPlace = matches.find((match) => match.stage === "knockout" && match.isThirdPlace);
  const totalRounds = countKnockoutRounds(matches);
  if (columns.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Vacío
     */
    return <p className="text-sm text-mist">{t("events.fixtureEmpty")}</p>;
  }
  /**
   * Output:
   * @returns JSX.Element — Llaves con scroll horizontal
   */
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-6">
          {columns.map((column) => (
            <div key={column[0].round} className="flex w-60 flex-col">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-lime">
                {getRoundTitle(t, column[0], totalRounds)}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {column.map((match) => (
                  <BracketMatch key={match.matchId} match={match} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {thirdPlace ? (
        <div className="w-60">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-lime">
            {t("events.thirdPlaceMatch")}
          </h3>
          <BracketMatch match={thirdPlace} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Propósito: Caja de un partido en el cuadro.
 */
function BracketMatch({ match }: { match: EventMatch }) {
  const { t } = useI18n();
  const sides = [
    {
      key: "home",
      name: match.homeTeamName,
      score: match.homeScore,
      penalties: match.homePenalties,
      isWinner: match.winnerRegistrationId !== null && match.winnerRegistrationId === match.homeRegistrationId,
    },
    {
      key: "away",
      name: match.awayTeamName,
      score: match.awayScore,
      penalties: match.awayPenalties,
      isWinner: match.winnerRegistrationId !== null && match.winnerRegistrationId === match.awayRegistrationId,
    },
  ];
  /**
   * Output:
   * @returns JSX.Element — Dos filas (local y visitante)
   */
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-ink/40">
      {sides.map((side) => (
        <div
          key={side.key}
          className={cn(
            "flex items-center justify-between gap-2 border-white/5 px-3 py-2 text-sm first:border-b",
            side.isWinner ? "bg-lime/10 font-semibold text-bone" : "text-mist",
          )}
        >
          <span className="truncate">{side.name ?? t("events.toBeDefined")}</span>
          <span className="shrink-0 tabular-nums">
            {isMatchPlayed(match) ? side.score : ""}
            {isMatchPlayed(match) && side.penalties !== null ? (
              <span className="ml-1 text-[10px] text-mist">({side.penalties})</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
