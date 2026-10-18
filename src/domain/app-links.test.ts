import assert from "node:assert/strict";
import test from "node:test";

import { buildAndroidAssetLinks, buildAppleAppSiteAssociation } from "./app-links";

const FINGERPRINT = Array.from({ length: 32 }, () => "ab").join(":");

test("AASA solo se publica con App IDs válidos y reclama solo /restablecer", () => {
  assert.equal(buildAppleAppSiteAssociation(undefined), null);
  assert.equal(buildAppleAppSiteAssociation("com.canchaya.app"), null);
  const document = buildAppleAppSiteAssociation("ABCDE12345.com.canchaya.app, bad, ABCDE12345.com.canchaya.app");
  assert.deepEqual(document?.applinks.details[0]?.appIDs, ["ABCDE12345.com.canchaya.app"]);
  assert.deepEqual(
    document?.applinks.details[0]?.components.map((component) => component["/"]),
    ["/restablecer"],
  );
});

test("assetlinks exige paquete y huellas SHA-256 válidas", () => {
  assert.equal(buildAndroidAssetLinks("com.canchaya.app", undefined), null);
  assert.equal(buildAndroidAssetLinks("not a package", FINGERPRINT), null);
  assert.equal(buildAndroidAssetLinks("com.canchaya.app", "AB:CD"), null);
  const links = buildAndroidAssetLinks("com.canchaya.app", FINGERPRINT);
  assert.equal(links?.[0]?.target.package_name, "com.canchaya.app");
  assert.deepEqual(links?.[0]?.target.sha256_cert_fingerprints, [FINGERPRINT.toUpperCase()]);
});
