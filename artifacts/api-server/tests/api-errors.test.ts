import assert from "node:assert/strict";
import { test } from "node:test";
import { describeApiError } from "../src/lib/api-errors.js";

const queryFailure = (cause: unknown) => new Error("Failed query: select private_data\nparams: private", { cause });

test("classifies PostgreSQL authentication and schema errors through the Drizzle cause", () => {
  assert.equal(describeApiError(queryFailure({ code: "28P01" })).code, "DATABASE_AUTH_FAILED");
  assert.equal(describeApiError(queryFailure({ code: "42P01" })).code, "DATABASE_SCHEMA_MISMATCH");
  assert.equal(describeApiError(queryFailure({ code: "42501" })).code, "DATABASE_PERMISSION_DENIED");
});

test("classifies TLS, DNS and nested aggregate connection errors", () => {
  assert.equal(describeApiError(queryFailure({ code: "SELF_SIGNED_CERT_IN_CHAIN" })).code, "DATABASE_TLS_ERROR");
  assert.equal(describeApiError(queryFailure({ code: "ENOTFOUND" })).code, "DATABASE_HOST_NOT_FOUND");
  assert.equal(describeApiError(queryFailure(new AggregateError([{ code: "ECONNREFUSED" }]))).code, "DATABASE_UNREACHABLE");
});

test("does not return query, parameters, credentials or arbitrary error properties", () => {
  const failure = describeApiError(queryFailure({
    code: "ERR_INVALID_URL",
    input: "postgresql://private:private@example.test/private",
    message: "private",
  }));
  assert.equal(failure.code, "DATABASE_CONNECTION_INVALID");
  assert.ok(!JSON.stringify(failure).includes("private"));
});

test("handles cyclic causes and preserves invalid request status", () => {
  const cyclic: { cause?: unknown } = {};
  cyclic.cause = cyclic;
  assert.equal(describeApiError(cyclic).code, "INTERNAL_ERROR");
  assert.equal(describeApiError({ status: 413 }).status, 413);
});
