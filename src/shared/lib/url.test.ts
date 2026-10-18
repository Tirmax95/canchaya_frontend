import assert from "node:assert/strict";
import test from "node:test";
import { isSafeImageSrc, toSafeInternalPath } from "./url";

test("toSafeInternalPath conserva rutas internas", () => {
  assert.equal(toSafeInternalPath("/reservas?x=1#a"), "/reservas?x=1#a");
  assert.equal(toSafeInternalPath(["/perfil", "/otra"]), "/perfil");
});

test("toSafeInternalPath bloquea open redirects", () => {
  for (const candidate of [
    "//evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\\evil.com",
    "https://evil.com",
    "evil.com",
    "",
  ]) {
    assert.equal(toSafeInternalPath(candidate), null, JSON.stringify(candidate));
  }
});

test("isSafeImageSrc acepta http(s) y portadas propias", () => {
  assert.equal(isSafeImageSrc("https://images.unsplash.com/a.jpg"), true);
  assert.equal(isSafeImageSrc("/uploads/events/3f2b8c1e-9a4d-4c2b-8f1e-2d3c4b5a6f70.svg"), true);
});

test("isSafeImageSrc rechaza javascript:, data: y rutas manipuladas", () => {
  for (const candidate of [
    "javascript:alert(1)",
    "data:image/svg+xml,<svg onload=alert(1)>",
    "/uploads/events/../../.env",
    "/uploads/events/foto.png",
    "/admin",
    "",
  ]) {
    assert.equal(isSafeImageSrc(candidate), false, candidate);
  }
});
