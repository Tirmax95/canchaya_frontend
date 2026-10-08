import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCourtSnapshot,
  buildHourlyOccupancy,
  estimateDayRevenue,
  findPeakHour,
  formatHourOfDay,
  getLocalDayBounds,
  groupActiveReservationsByField,
  isIsoCalendarDate,
  shiftIsoCalendarDate,
  summarizeVenueOccupancy,
  toLocalHourOfDay,
  type OccupancyReservation,
} from "@/domain/venue-occupancy";

const day = "2026-10-08";

const reservations: OccupancyReservation[] = [
  {
    reservationId: 1,
    fieldId: 10,
    startTime: "2026-10-08T18:00:00.000-05:00",
    endTime: "2026-10-08T19:00:00.000-05:00",
    status: "confirmed",
  },
  {
    reservationId: 2,
    fieldId: 10,
    startTime: "2026-10-08T20:00:00.000-05:00",
    endTime: "2026-10-08T22:00:00.000-05:00",
    status: "pending",
  },
  {
    reservationId: 3,
    fieldId: 11,
    startTime: "2026-10-08T18:00:00.000-05:00",
    endTime: "2026-10-08T19:00:00.000-05:00",
    status: "cancelled",
  },
];

test("valida fechas civiles reales", () => {
  assert.equal(isIsoCalendarDate("2026-10-08"), true);
  assert.equal(isIsoCalendarDate("2026-02-31"), false);
  assert.equal(isIsoCalendarDate("08/10/2026"), false);
  assert.equal(isIsoCalendarDate(undefined), false);
});

test("desplaza fechas civiles cruzando meses", () => {
  assert.equal(shiftIsoCalendarDate("2026-10-31", 1), "2026-11-01");
  assert.equal(shiftIsoCalendarDate("2026-03-01", -1), "2026-02-28");
});

test("calcula límites del día en hora de Bogotá", () => {
  const { start, end } = getLocalDayBounds(day);
  assert.equal(start.toISOString(), "2026-10-08T05:00:00.000Z");
  assert.equal(end.toISOString(), "2026-10-09T05:00:00.000Z");
});

test("convierte instantes a hora local y la formatea", () => {
  assert.equal(toLocalHourOfDay("2026-10-08T23:30:00.000Z"), 18.5);
  assert.equal(formatHourOfDay(18.5), "18:30");
});

test("agrupa por cancha ignorando canceladas", () => {
  const grouped = groupActiveReservationsByField(reservations);
  assert.equal(grouped.get(10)?.length, 2);
  assert.equal(grouped.has(11), false);
});

test("marca en juego, arranca pronto y por confirmar según el instante", () => {
  const fieldReservations = groupActiveReservationsByField(reservations).get(10) ?? [];

  const duringMatch = buildCourtSnapshot(
    10,
    fieldReservations,
    new Date("2026-10-08T18:30:00.000-05:00"),
    day,
  );
  assert.equal(duringMatch.status, "in_play");
  assert.equal(duringMatch.matchProgress, 0.5);
  assert.equal(duringMatch.nextReservation?.reservationId, 2);
  assert.equal(duringMatch.bookedHours, 3);

  const beforePending = buildCourtSnapshot(
    10,
    fieldReservations,
    new Date("2026-10-08T19:30:00.000-05:00"),
    day,
  );
  assert.equal(beforePending.status, "starting_soon");
  assert.equal(beforePending.minutesUntilNext, 30);

  const duringPending = buildCourtSnapshot(
    10,
    fieldReservations,
    new Date("2026-10-08T21:00:00.000-05:00"),
    day,
  );
  assert.equal(duringPending.status, "awaiting_confirmation");

  const emptyCourt = buildCourtSnapshot(11, [], new Date("2026-10-08T21:00:00.000-05:00"), day);
  assert.equal(emptyCourt.status, "free");
});

test("resume ocupación de la sede", () => {
  const grouped = groupActiveReservationsByField(reservations);
  const instant = new Date("2026-10-08T18:30:00.000-05:00");
  const snapshots = [10, 11].map((fieldId) =>
    buildCourtSnapshot(fieldId, grouped.get(fieldId) ?? [], instant, day),
  );
  const summary = summarizeVenueOccupancy(snapshots, 1);
  assert.equal(summary.occupiedCourtCount, 1);
  assert.equal(summary.reservationCount, 2);
  assert.equal(summary.bookedHours, 3);
  assert.equal(summary.occupancyRatio, 3 / 34);
});

test("detecta la hora pico y estima ingresos", () => {
  const hourly = buildHourlyOccupancy(reservations, day);
  assert.equal(findPeakHour(hourly), 18);
  assert.equal(estimateDayRevenue(reservations, new Map([[10, 100_000]])), 300_000);
});
