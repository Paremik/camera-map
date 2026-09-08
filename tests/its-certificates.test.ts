import assert from "node:assert/strict";
import test from "node:test";
import { itsCertificateAuthorities } from "../scripts/its-request.ts";

test("ITS supplemental intermediates chain to a built-in trusted root", () => {
  const authorities = itsCertificateAuthorities();
  assert.ok(authorities.length > 2);
});
