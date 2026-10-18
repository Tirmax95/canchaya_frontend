import assert from "node:assert/strict";
import test from "node:test";
import { buildSeedOrder, buildTreeFromMatches, projectGroupKnockout } from "./bracket";
import type { EventMatch, StandingsTable } from "./events";

const settings = { groupCount: 2, qualifiersPerGroup: 4, thirdPlaceMatch: false };

test("buildSeedOrder usa el orden estándar", () => {
  assert.deepEqual(buildSeedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
});

test("proyección 2 grupos × 4: cuartos 1A–4B, 2B–3A, 1B–4A, 2A–3B", () => {
  const tree = projectGroupKnockout(settings, []);
  assert.equal(tree.totalRounds, 3);
  assert.equal(tree.isProjection, true);
  const quarters = tree.rounds[0].map((match) => [match.home, match.away]);
  assert.deepEqual(quarters, [
    [{ kind: "seed", group: "A", place: 1 }, { kind: "seed", group: "B", place: 4 }],
    [{ kind: "seed", group: "B", place: 2 }, { kind: "seed", group: "A", place: 3 }],
    [{ kind: "seed", group: "B", place: 1 }, { kind: "seed", group: "A", place: 4 }],
    [{ kind: "seed", group: "A", place: 2 }, { kind: "seed", group: "B", place: 3 }],
  ]);
  assert.deepEqual(tree.rounds[2][0].home, { kind: "winner", round: 2, matchNumber: 1 });
});

test("proyección muestra al líder provisional solo si el grupo ya jugó", () => {
  const row = (teamName: string, played: number) => ({
    registrationId: 1, teamName, played, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [],
  });
  const standings: StandingsTable[] = [
    { groupLabel: "A", rows: [row("Halcones de Suba", 2), row("Inter Kennedy", 2)] },
    { groupLabel: "B", rows: [row("Real Usaquén FC", 0), row("Atlético Cedritos", 0)] },
  ];
  const tree = projectGroupKnockout({ groupCount: 2, qualifiersPerGroup: 2, thirdPlaceMatch: true }, standings);
  assert.deepEqual(tree.rounds[0][0].home, {
    kind: "team", name: "Halcones de Suba", seed: { group: "A", place: 1 }, isProvisional: true,
  });
  assert.deepEqual(tree.rounds[0][0].away, { kind: "seed", group: "B", place: 2 });
  assert.ok(tree.thirdPlace);
});

test("proyección con byes: 6 clasificados en llave de 8", () => {
  const tree = projectGroupKnockout({ groupCount: 3, qualifiersPerGroup: 2, thirdPlaceMatch: false }, []);
  const byes = tree.rounds[0].filter((match) => match.isBye);
  assert.equal(byes.length, 2);
  assert.deepEqual(tree.rounds[1][0].home, { kind: "seed", group: "A", place: 1 });
});

test("árbol real: byes de primera ronda, ganador y campeón", () => {
  const base = {
    eventId: 1, groupLabel: null, isThirdPlace: false, homeRegistrationId: 1, awayRegistrationId: 2,
    homePenalties: null, awayPenalties: null, status: "played", nextMatchId: null, fieldId: null,
    startsAt: null, endsAt: null, notes: "", fieldName: null,
  } as const;
  const matches = [
    { ...base, matchId: 1, stage: "knockout", round: 1, bracketPosition: 1, homeTeamName: "C", awayTeamName: "D", homeScore: 2, awayScore: 0, winnerRegistrationId: 1 },
    { ...base, matchId: 2, stage: "knockout", round: 2, bracketPosition: 0, homeTeamName: "A", awayTeamName: "C", homeScore: 1, awayScore: 3, winnerRegistrationId: 2 },
  ] as unknown as EventMatch[];
  const tree = buildTreeFromMatches(matches, null);
  assert.equal(tree.totalRounds, 2);
  assert.equal(tree.rounds[0][0].isBye, true);
  assert.deepEqual(tree.rounds[0][0].home, { kind: "team", name: "A" });
  assert.equal(tree.champion, "C");
});
