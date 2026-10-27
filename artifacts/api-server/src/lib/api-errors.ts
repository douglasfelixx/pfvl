const databaseErrors: Record<string, string> = {
  "28P01": "DATABASE_AUTH_FAILED",
  "28000": "DATABASE_AUTH_FAILED",
  "3D000": "DATABASE_NOT_FOUND",
  "42P01": "DATABASE_SCHEMA_MISMATCH",
  "42703": "DATABASE_SCHEMA_MISMATCH",
  "42501": "DATABASE_PERMISSION_DENIED",
  ECONNREFUSED: "DATABASE_UNREACHABLE",
  ENETUNREACH: "DATABASE_UNREACHABLE",
  EHOSTUNREACH: "DATABASE_UNREACHABLE",
  ENOTFOUND: "DATABASE_HOST_NOT_FOUND",
  EAI_AGAIN: "DATABASE_HOST_NOT_FOUND",
  ETIMEDOUT: "DATABASE_CONNECTION_TIMEOUT",
  ECONNRESET: "DATABASE_CONNECTION_INTERRUPTED",
  "57P03": "DATABASE_UNAVAILABLE",
  "53300": "DATABASE_UNAVAILABLE",
  ERR_INVALID_URL: "DATABASE_CONNECTION_INVALID",
  SELF_SIGNED_CERT_IN_CHAIN: "DATABASE_TLS_ERROR",
  DEPTH_ZERO_SELF_SIGNED_CERT: "DATABASE_TLS_ERROR",
  CERT_HAS_EXPIRED: "DATABASE_TLS_ERROR",
  ERR_TLS_CERT_ALTNAME_INVALID: "DATABASE_TLS_ERROR",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "DATABASE_TLS_ERROR",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: "DATABASE_TLS_ERROR",
};

/** Describe failures without serializing SQL, parameters, messages, or credentials. */
export function describeApiError(error: unknown) {
  const queue: unknown[] = [error];
  const visited = new Set<unknown>();
  const codes: string[] = [];
  let databaseQuery = false;
  let passwordInvalid = false;
  let tlsFailure = false;
  let requestStatus: number | undefined;

  while (queue.length && visited.size < 20) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) continue;
    visited.add(current);
    const value = current as Record<string, unknown>;
    if (typeof value.code === "string" && /^[A-Z0-9_]{2,60}$/.test(value.code)) {
      codes.push(value.code);
    }
    if (typeof value.message === "string") {
      databaseQuery ||= /^Failed query:/i.test(value.message);
      passwordInvalid ||= /SASL.*password must be a string/i.test(value.message);
      tlsFailure ||= /self.signed certificate|server does not support SSL|certificate has expired/i.test(value.message);
    }
    if (typeof value.status === "number" && value.status >= 400 && value.status < 500) {
      requestStatus ??= value.status;
    }
    if (value.cause) queue.push(value.cause);
    if (Array.isArray(value.errors)) queue.push(...value.errors.slice(0, 10));
  }

  let code = requestStatus ? "INVALID_REQUEST" : "INTERNAL_ERROR";
  let status = requestStatus ?? 500;
  if (databaseQuery || codes.some((value) => /^[0-9A-Z]{5}$/.test(value))) {
    code = codes.map((value) => databaseErrors[value]).find(Boolean) ??
      (passwordInvalid ? "DATABASE_CONNECTION_INVALID" :
        tlsFailure ? "DATABASE_TLS_ERROR" : "DATABASE_QUERY_FAILED");
    status = ["DATABASE_SCHEMA_MISMATCH", "DATABASE_PERMISSION_DENIED", "DATABASE_QUERY_FAILED"].includes(code)
      ? 500 : 503;
  }
  return { code, status, causeCodes: [...new Set(codes)] };
}
