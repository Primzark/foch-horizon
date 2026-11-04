const SENSITIVE_QUERY_SUFFIX_PATTERN = /(?:token|secret|password|passcode|credential|authorization|nonce|otp|session(?:id)?|state)$/i;
const PERSONAL_QUERY_PARAMETERS = new Set([
  "email",
  "phone",
  "mobile",
  "telephone",
  "name",
  "firstname",
  "lastname",
  "message",
  "q",
  "query",
  "search",
  "keyword",
  "term",
  "searchterm",
]);

export function sanitizeAnalyticsUrl(value: string, baseUrl = window.location.origin): string {
  try {
    const url = new URL(value, baseUrl);

    for (const parameterName of [...url.searchParams.keys()]) {
      const normalizedName = parameterName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const sensitive =
        SENSITIVE_QUERY_SUFFIX_PATTERN.test(normalizedName) ||
        PERSONAL_QUERY_PARAMETERS.has(normalizedName) ||
        ["auth", "code", "key", "apikey", "clientsecret", "privatekey", "confirmation", "confirmationcode", "verification", "verificationcode", "reset", "resetcode"].includes(normalizedName);

      if (sensitive) url.searchParams.delete(parameterName);
    }

    return url.toString();
  } catch {
    return value;
  }
}
