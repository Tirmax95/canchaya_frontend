import assert from "node:assert/strict";
import test from "node:test";
import type { ReservationView } from "@/domain/reservation";
import {
  buildReservationInbox,
  parseInboxTenantKey,
  reservationTenantKey,
  toCivilDate,
} from "@/domain/reservation-inbox";

const NOW = new Date("2026-10-08T17:00:00.000-05:00");

/**
 * Propósito: Fabrica una reserva de prueba con defaults razonables para el inbox.
 */
function view(overrides: Partial<ReservationView>): ReservationView {
  /**
   * Output:
   * @returns ReservationView — Reserva lista para filtrar/agrupar
   */
  return {
    reservationId: 1,
    userId: 4,
    fieldId: 10,
    startTime: "2026-10-13T18:00:00.000-05:00",
    endTime: "2026-10-13T19:00:00.000-05:00",
    status: "cancelled",
    fieldName: "Cancha A",
    establishmentName: "Canchas Dany",
    establishmentId: 1,
    organizationId: 1,
    organizationName: "Canchas Dany",
    priceEstimate: 90_000,
    ...overrides,
  };
}

test("toCivilDate usa el día de Bogotá, no UTC", () => {
  assert.equal(toCivilDate("2026-10-08T04:00:00.000Z"), "2026-10-07");
  assert.equal(toCivilDate("2026-10-08T05:00:00.000Z"), "2026-10-08");
});

test("parseInboxTenantKey solo acepta org, est o un id positivo", () => {
  assert.equal(parseInboxTenantKey(undefined), "all");
  assert.equal(parseInboxTenantKey("org:12"), "org:12");
  assert.equal(parseInboxTenantKey("est:5"), "est:5");
  assert.equal(parseInboxTenantKey("3"), "org:3");
  assert.equal(parseInboxTenantKey("../1"), "all");
  assert.equal(parseInboxTenantKey("org:abc"), "all");
});

test("agrupa por tenant y oculta canceladas en el filtro activas", () => {
  const inbox = buildReservationInbox(
    [
      view({ reservationId: 1, status: "cancelled" }),
      view({
        reservationId: 2,
        fieldId: 20,
        fieldName: "Cancha 2",
        establishmentName: "El Cubo",
        establishmentId: 2,
        organizationId: 2,
        organizationName: "El Cubo",
        startTime: "2026-10-08T18:00:00.000-05:00",
        endTime: "2026-10-08T19:00:00.000-05:00",
        status: "confirmed",
        priceEstimate: 60_000,
        userId: 1,
      }),
    ],
    { tenantKey: "all", status: "actionable", window: "upcoming", query: "", fieldId: null },
    NOW,
  );

  assert.equal(inbox.tenants.length, 2);
  assert.equal(inbox.visibleCount, 1);
  assert.equal(inbox.hiddenCancelledCount, 1);
  assert.equal(inbox.groups.length, 1);
  assert.equal(inbox.groups[0]?.label, "El Cubo");
  assert.equal(inbox.groups[0]?.dayGroups[0]?.dayKey, "2026-10-08");
});

test("el filtro de tenant recorta KPIs y canchas al tenant elegido", () => {
  const reservations = [
    view({ reservationId: 1, organizationId: 1, organizationName: "Canchas Dany" }),
    view({
      reservationId: 2,
      organizationId: 2,
      organizationName: "El Cubo",
      establishmentName: "El Cubo",
      establishmentId: 2,
      fieldId: 20,
      fieldName: "Cancha 2",
      status: "pending",
      startTime: "2026-10-09T12:00:00.000-05:00",
      endTime: "2026-10-09T13:00:00.000-05:00",
    }),
  ];
  const inbox = buildReservationInbox(
    reservations,
    { tenantKey: "org:2", status: "all", window: "all", query: "", fieldId: null },
    NOW,
  );

  assert.equal(inbox.summary.total, 1);
  assert.equal(inbox.summary.pending, 1);
  assert.deepEqual(
    inbox.fields.map((field) => field.fieldId),
    [20],
  );
  assert.equal(inbox.groups[0]?.key, "org:2");
});

test("la búsqueda encuentra jugador y cancha sin mezclar tenants", () => {
  const inbox = buildReservationInbox(
    [
      view({ reservationId: 1, userId: 4, fieldName: "Cancha A" }),
      view({
        reservationId: 2,
        userId: 1,
        fieldName: "Cancha 2",
        organizationId: 2,
        organizationName: "El Cubo",
        establishmentName: "El Cubo",
        status: "confirmed",
      }),
    ],
    { tenantKey: "all", status: "all", window: "all", query: "jugador #1", fieldId: null },
    NOW,
  );

  assert.equal(inbox.visibleCount, 1);
  assert.equal(inbox.groups[0]?.label, "El Cubo");
});

test("reservationTenantKey cae a la sede cuando no hay organización", () => {
  assert.equal(
    reservationTenantKey(
      view({ organizationId: null, organizationName: null, establishmentId: 9 }),
    ),
    "est:9",
  );
});
