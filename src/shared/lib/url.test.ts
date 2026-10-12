import assert from "node:assert/strict";
import test from "node:test";
import { toSafeInternalPath } from "./url";

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
