import assert from "node:assert/strict";
import test from "node:test";
import { X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import { fetchIts, verifyIntermediateChain } from "../lib/its-https.ts";

const now = Date.now();
const roots = rootCertificates.map(pem => new X509Certificate(pem)).filter(cert => Date.parse(cert.validFrom) < now && Date.parse(cert.validTo) > now);

test("CA repair requires an existing trusted root, valid dates and an intact issuer chain", () => {
  assert.ok(roots.length > 2);
  assert.equal(verifyIntermediateChain([roots[0]], [roots[0]]), true);
  assert.equal(verifyIntermediateChain([roots[0]], [roots[1]]), false);
  assert.equal(verifyIntermediateChain([roots[0], roots[1]], roots), false);
  assert.equal(verifyIntermediateChain([], roots), false);
  assert.equal(verifyIntermediateChain([roots[0]], roots, Date.parse(roots[0].validFrom) - 1), false);
  assert.equal(verifyIntermediateChain([roots[0]], roots, Date.parse(roots[0].validTo) + 1), false);
});

test("ITS transport refuses arbitrary origins, credentials and paths before requesting", async () => {
  for (const url of ["https://private.example/api/cameras/120/images", "http://its.mzd.opole.pl/api/cameras/120/images", "https://user:password@its.mzd.opole.pl/api/cameras/120/images", "https://its.mzd.opole.pl/api/cameras/120/images?url=other", "https://its.mzd.opole.pl/private", "https://its.mzd.opole.pl/api/camera/image/120/two..dots.jpg"]) {
    await assert.rejects(fetchIts(url), /Unsupported ITS URL/);
  }
});
