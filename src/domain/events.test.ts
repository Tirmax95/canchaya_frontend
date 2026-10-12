import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBracketColumns,
  formatScore,
  getFreeSeats,
  getKnockoutRoundKey,
  getNextLifecycleAction,
  groupMatchesByRound,
  type EventMatch,
} from "@/domain/events";
import { eventActionSchema, matchUpdateSchema, createEventSchema } from "@/domain/schemas";

/**
 * Propósito: Partido mínimo para pruebas.
 */
function match(partial: Partial<EventMatch>): EventMatch {
  return {
    matchId: 1,
    eventId: 1,
    stage: "league",
    round: 1,
    groupLabel: null,
    bracketPosition: null,
    isThirdPlace: false,
    homeRegistrationId: 1,
    awayRegistrationId: 2,
    homeScore: null,
    awayScore: null,
    homePenalties: null,
    awayPenalties: null,
    winnerRegistrationId: null,
    status: "pending",
    nextMatchId: null,
    fieldId: null,
    startsAt: null,
    endsAt: null,
    notes: "",
    homeTeamName: "A",
    awayTeamName: "B",
    fieldName: null,
    ...partial,
  };
}

test("nombra las rondas de la llave desde la final", () => {
  assert.equal(getKnockoutRoundKey(3, 3), "final");
  assert.equal(getKnockoutRoundKey(2, 3), "semifinal");
  assert.equal(getKnockoutRoundKey(1, 3), "quarterfinal");
  assert.equal(getKnockoutRoundKey(1, 6), null);
});

test("agrupa partidos por fase, grupo y fecha en orden", () => {
  const blocks = groupMatchesByRound([
    match({ matchId: 3, stage: "knockout", round: 1 }),
    match({ matchId: 2, stage: "group", groupLabel: "B", round: 1 }),
    match({ matchId: 1, stage: "group", groupLabel: "A", round: 2 }),
    match({ matchId: 4, stage: "group", groupLabel: "A", round: 1 }),
  ]);
  assert.deepEqual(
    blocks.map((block) => `${block.stage}${block.groupLabel ?? ""}${block.round}`),
    ["groupA1", "groupA2", "groupB1", "knockout1"],
  );
});

test("arma columnas de la llave sin el tercer puesto", () => {
  const columns = buildBracketColumns([
    match({ matchId: 1, stage: "knockout", round: 1, bracketPosition: 1 }),
    match({ matchId: 2, stage: "knockout", round: 1, bracketPosition: 0 }),
    match({ matchId: 3, stage: "knockout", round: 2, bracketPosition: 0 }),
    match({ matchId: 4, stage: "knockout", round: 2, bracketPosition: 1, isThirdPlace: true }),
  ]);
  assert.deepEqual(columns.map((column) => column.map((item) => item.matchId)), [[2, 1], [3]]);
});

test("formatea marcador con penales solo si se jugó", () => {
  assert.equal(formatScore(match({})), null);
  assert.equal(
    formatScore(match({ status: "completed", homeScore: 1, awayScore: 1, homePenalties: 4, awayPenalties: 3 })),
    "1 - 1 (4-3 pen.)",
  );
});

test("cupos libres y siguiente paso del organizador", () => {
  assert.equal(getFreeSeats({ maxTeams: 8, seatsTaken: 10 }), 0);
  assert.equal(getNextLifecycleAction("registration_closed"), "start");
  assert.equal(getNextLifecycleAction("cancelled"), null);
});

test("valida acciones y resultados antes de llamar al backend", () => {
  assert.equal(eventActionSchema.safeParse({ action: "cancel", reason: "x" }).success, false);
  assert.equal(eventActionSchema.safeParse({ action: "start", randomize: true }).success, true);
  assert.equal(
    matchUpdateSchema.safeParse({ kind: "result", home_score: 120, away_score: 0 }).success,
    false,
  );
  assert.equal(
    createEventSchema.safeParse({
      establishment_id: 1,
      name: "Copa",
      sport: "football_5",
      format: "knockout",
      starts_on: "2026-11-01",
      max_teams: 8,
    }).success,
    true,
  );
  assert.equal(createEventSchema.safeParse({ name: "Copa" }).success, false);
});
