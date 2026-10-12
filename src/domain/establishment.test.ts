import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDirectionsLinks,
  buildInstagramLink,
  buildWhatsAppLink,
  hasLocation,
  isOpenAt,
  normalizeAmenities,
  validateOpeningHours,
  type OpeningHoursDay,
} from "@/domain/establishment";

const WEEKDAY_HOURS: OpeningHoursDay[] = [
  { day: 0, closed: true, opensAt: null, closesAt: null },
  { day: 1, closed: false, opensAt: "06:00", closesAt: "22:00" },
  { day: 6, closed: false, opensAt: "08:00", closesAt: "24:00" },
];

test("valida el horario con las reglas del backend", () => {
  assert.equal(validateOpeningHours(WEEKDAY_HOURS), null);
  assert.equal(
    validateOpeningHours([{ day: 2, closed: false, opensAt: "22:00", closesAt: "06:00" }]),
    "invertedRange",
  );
  assert.equal(
    validateOpeningHours([{ day: 2, closed: false, opensAt: "6:00", closesAt: "22:00" }]),
    "invalidTime",
  );
  assert.equal(
    validateOpeningHours([
      { day: 3, closed: true, opensAt: null, closesAt: null },
      { day: 3, closed: true, opensAt: null, closesAt: null },
    ]),
    "invalidDay",
  );
});

test("calcula abierto/cerrado según día y minuto", () => {
  assert.equal(isOpenAt(WEEKDAY_HOURS, 1, 6 * 60), true);
  assert.equal(isOpenAt(WEEKDAY_HOURS, 1, 22 * 60), false);
  assert.equal(isOpenAt(WEEKDAY_HOURS, 0, 12 * 60), false);
  assert.equal(isOpenAt(WEEKDAY_HOURS, 6, 23 * 60 + 59), true);
  assert.equal(isOpenAt(WEEKDAY_HOURS, 3, 12 * 60), null);
});

test("filtra servicios desconocidos", () => {
  assert.deepEqual(normalizeAmenities(["wifi", "parking", "spa", "wifi"]), ["parking", "wifi"]);
  assert.deepEqual(normalizeAmenities(null), []);
});

test("arma rutas por coordenadas o por dirección", () => {
  const withCoordinates = buildDirectionsLinks({
    name: "El Cubo",
    address: "Cra 15 #127-45",
    city: "Bogotá",
    latitude: 4.7,
    longitude: -74.05,
  });
  assert.match(withCoordinates?.googleMaps ?? "", /destination=4\.7%2C-74\.05/);
  assert.match(withCoordinates?.waze ?? "", /ll=4\.7%2C-74\.05/);

  const withAddress = buildDirectionsLinks({
    name: "El Cubo",
    address: "Cra 15 #127-45",
    city: "Bogotá",
    latitude: null,
    longitude: null,
  });
  assert.match(withAddress?.googleMaps ?? "", /Cra%2015%20%23127-45/);
  assert.equal(
    buildDirectionsLinks({ name: "X", address: "", city: "", latitude: null, longitude: null }),
    null,
  );
  assert.equal(hasLocation({ latitude: 4.7, longitude: null }), false);
});

test("normaliza enlaces de WhatsApp e Instagram", () => {
  assert.equal(buildWhatsAppLink("+57 300 123 4567"), "https://wa.me/573001234567");
  assert.equal(buildWhatsAppLink("123"), null);
  assert.equal(buildInstagramLink("@el.cubo"), "https://instagram.com/el.cubo");
  assert.equal(buildInstagramLink("javascript:alert(1)"), null);
});
