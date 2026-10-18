import assert from "node:assert/strict";
import { test } from "node:test";

import { parseLegalEntity } from "./legal-entity";

const complete = {
  name: "CanchaYa S.A.S.",
  taxId: "900.123.456-7",
  address: "Bogotá, Colombia",
  contactEmail: "Legal@CanchaYa.co",
};

test("sin datos todo queda pendiente y es borrador", () => {
  const entity = parseLegalEntity({});
  assert.equal(entity.contactEmail, null);
  assert.equal(entity.name, null);
  assert.equal(entity.isFinal, false);
});

test("normaliza el correo y solo es definitivo con datos completos y revisión", () => {
  assert.equal(parseLegalEntity(complete).contactEmail, "legal@canchaya.co");
  assert.equal(parseLegalEntity(complete).isFinal, false);
  assert.equal(parseLegalEntity({ ...complete, reviewed: "true" }).isFinal, true);
  assert.equal(parseLegalEntity({ ...complete, taxId: " ", reviewed: "true" }).isFinal, false);
});

test("descarta correos inválidos o con HTML", () => {
  assert.equal(parseLegalEntity({ contactEmail: "no-es-correo" }).contactEmail, null);
  assert.equal(parseLegalEntity({ contactEmail: "<a>@x.co" }).contactEmail, null);
});
