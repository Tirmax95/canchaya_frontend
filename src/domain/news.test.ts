import assert from "node:assert/strict";
import test from "node:test";
import { isScheduledNewsPost, toDateTimeLocalValue } from "./news";
import { createNewsPostSchema, updateNewsPostSchema } from "./schemas";

test("isScheduledNewsPost distingue publicadas de programadas", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  assert.equal(isScheduledNewsPost({ publishedAt: "2026-10-17T11:59:00Z" }, now), false);
  assert.equal(isScheduledNewsPost({ publishedAt: "2026-10-18T09:00:00Z" }, now), true);
});

test("toDateTimeLocalValue arma el valor del input en hora local", () => {
  const local = new Date(2026, 9, 18, 9, 5);
  assert.equal(toDateTimeLocalValue(local.toISOString()), "2026-10-18T09:05");
  assert.equal(toDateTimeLocalValue("no-es-fecha"), "");
});

test("createNewsPostSchema exige tenant, título y cuerpo, y solo imágenes https", () => {
  const valid = createNewsPostSchema.safeParse({
    organization_id: 1,
    title: "Copa de verano",
    body: "Inscripciones abiertas",
    image_url: null,
    event_id: null,
  });
  assert.equal(valid.success, true);
  assert.equal(createNewsPostSchema.safeParse({ organization_id: 1, title: "Co", body: "x" }).success, false);
  assert.equal(
    createNewsPostSchema.safeParse({
      organization_id: 1,
      title: "Copa",
      body: "x",
      image_url: "javascript:alert(1)",
    }).success,
    false,
  );
});

test("updateNewsPostSchema permite quitar imagen y evento con null", () => {
  assert.equal(updateNewsPostSchema.safeParse({ image_url: null, event_id: null }).success, true);
  assert.equal(updateNewsPostSchema.safeParse({ published_at: "mañana" }).success, false);
});
