import type { EventMatch, StandingsTable } from "@/domain/events";

/**
 * Árbol de eliminatorias para pintar el cuadro como en las competencias profesionales.
 * Reglas puras: arma el árbol desde los partidos reales o, en grupos + eliminatoria antes
 * de cerrar los grupos, lo proyecta con la misma siembra que usa el backend
 * (`seedQualifiers` + `buildSeedOrder` en canchaya_backend/src/domain/events/fixtures.ts).
 */

export type TreeSlot =
  | { kind: "team"; name: string; seed?: { group: string; place: number }; isProvisional?: boolean }
  | { kind: "seed"; group: string; place: number }
  | { kind: "winner"; round: number; matchNumber: number }
  | { kind: "loser"; round: number; matchNumber: number }
  | { kind: "bye" }
  | { kind: "tbd" };

export interface TreeMatch {
  key: string;
  round: number;
  /** Posición dentro de la ronda (0 = arriba). */
  position: number;
  home: TreeSlot;
  away: TreeSlot;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  winner: "home" | "away" | null;
  startsAt: string | null;
  fieldName: string | null;
  /** Primera ronda sin partido: el equipo presente pasa directo. */
  isBye: boolean;
}

export interface BracketTree {
  totalRounds: number;
  /** `rounds[0]` es la primera ronda; cada una ordenada por posición. */
  rounds: TreeMatch[][];
  thirdPlace: TreeMatch | null;
  champion: string | null;
  /** True si es una proyección (la fase de grupos aún no termina). */
  isProjection: boolean;
}

const GROUP_LABELS = "ABCDEFGHIJKLMNOP".split("");

/**
 * Propósito: Menor potencia de 2 mayor o igual a `count` (tamaño de la llave).
 */
export function nextPowerOfTwo(count: number): number {
  let size = 1;
  while (size < count) {
    size *= 2;
  }
  /**
   * Output:
   * @returns number — Tamaño de la llave
   */
  return size;
}

/**
 * Propósito: Orden estándar de siembra por posición (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6…).
 */
export function buildSeedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const nextSize = order.length * 2;
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }
  /**
   * Output:
   * @returns number[] — Semilla por posición de la llave
   */
  return order;
}

/**
 * Propósito: Partido vacío del árbol.
 */
function emptyMatch(round: number, position: number, home: TreeSlot, away: TreeSlot): TreeMatch {
  /**
   * Output:
   * @returns TreeMatch — Sin marcador
   */
  return {
    key: `r${round}-p${position}`,
    round,
    position,
    home,
    away,
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    winner: null,
    startsAt: null,
    fieldName: null,
    isBye: false,
  };
}

/**
 * Propósito: Rondas 2..N con "Ganador del partido X" de la ronda anterior.
 */
function laterRounds(size: number, totalRounds: number): TreeMatch[][] {
  const rounds: TreeMatch[][] = [];
  for (let round = 2; round <= totalRounds; round += 1) {
    const count = size / 2 ** round;
    rounds.push(
      Array.from({ length: count }, (_, position) =>
        emptyMatch(
          round,
          position,
          { kind: "winner", round: round - 1, matchNumber: position * 2 + 1 },
          { kind: "winner", round: round - 1, matchNumber: position * 2 + 2 },
        ),
      ),
    );
  }
  /**
   * Output:
   * @returns TreeMatch[][] — Rondas posteriores a la primera
   */
  return rounds;
}

/**
 * Propósito: Proyecta la eliminatoria de un torneo de grupos con la siembra del backend:
 * todos los primeros, luego los segundos… Si un grupo ya jugó, muestra al equipo que hoy
 * ocupa ese puesto como provisional.
 */
export function projectGroupKnockout(
  settings: { groupCount: number; qualifiersPerGroup: number; thirdPlaceMatch: boolean },
  standings: StandingsTable[],
): BracketTree {
  const tables = standings.filter((table) => table.groupLabel);
  const labels = (
    tables.length > 0
      ? tables.map((table) => table.groupLabel as string)
      : GROUP_LABELS.slice(0, settings.groupCount)
  ).sort();
  const seeds: TreeSlot[] = [];
  for (let place = 1; place <= settings.qualifiersPerGroup; place += 1) {
    for (const group of labels) {
      const table = tables.find((candidate) => candidate.groupLabel === group);
      const hasPlayed = table?.rows.some((row) => row.played > 0) ?? false;
      const row = hasPlayed ? table?.rows[place - 1] : undefined;
      seeds.push(
        row
          ? { kind: "team", name: row.teamName, seed: { group, place }, isProvisional: true }
          : { kind: "seed", group, place },
      );
    }
  }
  if (seeds.length < 2) {
    /**
     * Output:
     * @returns BracketTree — Sin llave
     */
    return { totalRounds: 0, rounds: [], thirdPlace: null, champion: null, isProjection: true };
  }
  const size = nextPowerOfTwo(seeds.length);
  const totalRounds = Math.log2(size);
  const order = buildSeedOrder(size);
  const later = laterRounds(size, totalRounds);
  const firstRound = Array.from({ length: size / 2 }, (_, position) => {
    const home = seeds[order[position * 2] - 1];
    const away = seeds[order[position * 2 + 1] - 1];
    const match = emptyMatch(1, position, home ?? { kind: "bye" }, away ?? { kind: "bye" });
    if (!home || !away) {
      match.isBye = true;
      const advancing = home ?? away;
      const next = later[0]?.[Math.floor(position / 2)];
      if (next && advancing) {
        next[position % 2 === 0 ? "home" : "away"] = advancing;
      }
    }
    return match;
  });
  /**
   * Output:
   * @returns BracketTree — Cuadro proyectado
   */
  return {
    totalRounds,
    rounds: [firstRound, ...later],
    thirdPlace:
      settings.thirdPlaceMatch && totalRounds >= 2
        ? emptyMatch(
            totalRounds,
            1,
            { kind: "loser", round: totalRounds - 1, matchNumber: 1 },
            { kind: "loser", round: totalRounds - 1, matchNumber: 2 },
          )
        : null,
    champion: null,
    isProjection: true,
  };
}

/**
 * Propósito: Partido real → nodo del árbol (los cupos vacíos apuntan al ganador anterior).
 */
function fromEventMatch(match: EventMatch): TreeMatch {
  const position = match.bracketPosition ?? 0;
  const previous = (slotIndex: number): TreeSlot =>
    match.isThirdPlace
      ? { kind: "loser", round: match.round - 1, matchNumber: slotIndex + 1 }
      : match.round > 1
        ? { kind: "winner", round: match.round - 1, matchNumber: position * 2 + slotIndex + 1 }
        : { kind: "tbd" };
  const winner =
    match.winnerRegistrationId === null
      ? null
      : match.winnerRegistrationId === match.homeRegistrationId
        ? "home"
        : match.winnerRegistrationId === match.awayRegistrationId
          ? "away"
          : null;
  /**
   * Output:
   * @returns TreeMatch — Nodo con marcador
   */
  return {
    key: `m${match.matchId}`,
    round: match.round,
    position,
    home: match.homeTeamName ? { kind: "team", name: match.homeTeamName } : previous(0),
    away: match.awayTeamName ? { kind: "team", name: match.awayTeamName } : previous(1),
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homePenalties: match.homePenalties,
    awayPenalties: match.awayPenalties,
    winner,
    startsAt: match.startsAt,
    fieldName: match.fieldName,
    isBye: false,
  };
}

/**
 * Propósito: Árbol desde los partidos de eliminatoria ya creados. Los partidos de primera
 * ronda que no existen (byes) se dibujan como "pasa directo" con el equipo que avanzó.
 */
export function buildTreeFromMatches(
  matches: EventMatch[],
  championName: string | null,
): BracketTree {
  const knockout = matches.filter((match) => match.stage === "knockout");
  const main = knockout.filter((match) => !match.isThirdPlace);
  const totalRounds = main.reduce((max, match) => Math.max(max, match.round), 0);
  if (totalRounds === 0) {
    /**
     * Output:
     * @returns BracketTree — Sin llave todavía
     */
    return { totalRounds: 0, rounds: [], thirdPlace: null, champion: null, isProjection: false };
  }
  const size = 2 ** totalRounds;
  const rounds: TreeMatch[][] = [];
  for (let round = 1; round <= totalRounds; round += 1) {
    const count = size / 2 ** round;
    rounds.push(
      Array.from({ length: count }, (_, position) => {
        const existing = main.find(
          (match) => match.round === round && (match.bracketPosition ?? 0) === position,
        );
        if (existing) {
          return fromEventMatch(existing);
        }
        const bye = emptyMatch(round, position, { kind: "bye" }, { kind: "bye" });
        bye.isBye = round === 1;
        if (round === 1) {
          const next = main.find(
            (match) => match.round === 2 && (match.bracketPosition ?? 0) === Math.floor(position / 2),
          );
          const name = position % 2 === 0 ? next?.homeTeamName : next?.awayTeamName;
          bye.home = name ? { kind: "team", name } : { kind: "tbd" };
        }
        return bye;
      }),
    );
  }
  const final = rounds[totalRounds - 1][0];
  const finalWinner =
    final.winner === "home" && final.home.kind === "team"
      ? final.home.name
      : final.winner === "away" && final.away.kind === "team"
        ? final.away.name
        : null;
  const third = knockout.find((match) => match.isThirdPlace);
  /**
   * Output:
   * @returns BracketTree — Cuadro real
   */
  return {
    totalRounds,
    rounds,
    thirdPlace: third ? fromEventMatch(third) : null,
    champion: championName ?? finalWinner,
    isProjection: false,
  };
}
