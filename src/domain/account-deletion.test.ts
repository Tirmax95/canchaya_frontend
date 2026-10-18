import assert from "node:assert/strict";
import test from "node:test";
import { deleteAccountSchema } from "./schemas";

test("deleteAccountSchema requires the current password", () => {
  assert.equal(deleteAccountSchema.safeParse({ currentPassword: "" }).success, false);
  assert.equal(deleteAccountSchema.safeParse({}).success, false);
});

test("deleteAccountSchema treats a blank code as absent and trims a real one", () => {
  assert.deepEqual(deleteAccountSchema.parse({ currentPassword: "secret", code: "   " }), {
    currentPassword: "secret",
    code: undefined,
  });
  assert.equal(
    deleteAccountSchema.parse({ currentPassword: "secret", code: " 123456 " }).code,
    "123456",
  );
});

test("deleteAccountSchema ignores a userId sent in the body", () => {
  const parsed = deleteAccountSchema.parse({ currentPassword: "secret", userId: 99 });
  assert.equal("userId" in parsed, false);
});

test("deleteAccountSchema rejects oversized codes", () => {
  assert.equal(
    deleteAccountSchema.safeParse({ currentPassword: "secret", code: "1".repeat(17) }).success,
    false,
  );
});
