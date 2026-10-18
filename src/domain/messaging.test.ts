import assert from "node:assert/strict";
import test from "node:test";
import { buildMailtoUrl, buildWhatsappUrl, toWhatsappNumber } from "./messaging";

test("buildWhatsappUrl arma wa.me con el mensaje codificado", () => {
  assert.equal(
    buildWhatsappUrl("573001234567", "Hola Andrés, ¿confirmas?"),
    "https://wa.me/573001234567?text=Hola%20Andr%C3%A9s%2C%20%C2%BFconfirmas%3F",
  );
  assert.equal(buildWhatsappUrl(null, "x"), null);
  assert.equal(buildWhatsappUrl("abc", "x"), null);
});

test("buildMailtoUrl codifica asunto y cuerpo (sin inyectar cabeceras)", () => {
  const url = buildMailtoUrl("andres@canchaya.test", "Reserva\r\nBcc: x@y.z", "Hola");
  assert.ok(url.startsWith("mailto:andres%40canchaya.test?subject=Reserva%0D%0ABcc"));
  assert.ok(!url.includes("\n"));
});

test("toWhatsappNumber deja solo dígitos válidos", () => {
  assert.equal(toWhatsappNumber("+57 300 123 4567"), "573001234567");
  assert.equal(toWhatsappNumber("12"), null);
});
