import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDaySlots,
  estimateReservationPrice,
  hasTimeOverlap,
} from "@/domain/booking";

test("detecta solapes de horario", () => {
  const startA = new Date("2026-10-08T10:00:00.000Z");
  const endA = new Date("2026-10-08T11:00:00.000Z");
  const startB = new Date("2026-10-08T10:30:00.000Z");
  const endB = new Date("2026-10-08T11:30:00.000Z");

  assert.equal(hasTimeOverlap(startA, endA, startB, endB), true);
  assert.equal(
    hasTimeOverlap(
      startA,
      endA,
      new Date("2026-10-08T11:00:00.000Z"),
      new Date("2026-10-08T12:00:00.000Z"),
    ),
    false,
  );
});

test("bloquea franjas con reservas activas y deja libres las canceladas", () => {
  const slots = buildDaySlots(
    "2026-10-08",
    [
      {
        startTime: "2026-10-08T15:00:00.000-05:00",
        endTime: "2026-10-08T16:00:00.000-05:00",
        status: "confirmed",
      },
      {
        startTime: "2026-10-08T18:00:00.000-05:00",
        endTime: "2026-10-08T19:00:00.000-05:00",
        status: "cancelled",
      },
    ],
    "America/Bogota",
  );

  const occupied = slots.find((slot) => slot.label === "15:00 – 16:00");
  const cancelledSlot = slots.find((slot) => slot.label === "18:00 – 19:00");

  assert.equal(occupied?.isAvailable, false);
  assert.equal(cancelledSlot?.isAvailable, true);
  assert.equal(slots.length, 17);
});

test("estima el precio por horas completas", () => {
  assert.equal(
    estimateReservationPrice(
      "2026-10-08T15:00:00.000Z",
      "2026-10-08T17:00:00.000Z",
      80000,
    ),
    160000,
  );
  assert.equal(
    estimateReservationPrice(
      "2026-10-08T17:00:00.000Z",
      "2026-10-08T15:00:00.000Z",
      80000,
    ),
    0,
  );
});
