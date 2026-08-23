/**
 * Auth service helpers for JWT storage, loading, clearing, and expiry checks.
 * Uses cookies to persist the token across page reloads (accessible from JS).
 */

const TOKEN_COOKIE = "lemmygo_auth_token";
const EXPIRY_COOKIE = "lemmygo_auth_expiresAt";
const EMAIL_COOKIE = "lemmygo_auth_email";

// Cookie path shared by all auth cookies
const COOKIE_PATH = "/";

interface AuthData {
  token: string;
  expiresAt: number; // unix seconds
  email?: string;
}

/* ---- cookie helpers ---- */

/** Build the `expires=` fragment for `document.cookie`. */
function expiryCookie(maxAgeSeconds: number): string {
  const d = new Date(Date.now() + maxAgeSeconds * 1000);
  return `expires=${d.toUTCString()}`;
}

/** Detect if we're running over HTTPS (browser environment). */
function isSecure(): boolean {
  try {
    if (typeof document !== "undefined" && document.location) {
      return document.location.protocol === "https:";
    }
  } catch { /* noop */ }
  return false;
}

/** Read a single cookie value by name, or `` if absent. */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(^| )(" + name.replace(/[-[\]{}()*+?^.\\|$]/g, "\\$&") + ")=([^;]*)"),
  );
  return match ? decodeURIComponent(match[3]) : null;
}

/** Assign a cookie value. */
function writeCookie(name: string, value: string, maxAgeSeconds = 604800): void {
  // Default max-age = 7 days (same as JWT default lifetime)
  // Always include Secure flag on HTTPS — modern browsers refuse to persist cookies
  // without it on secure origins, causing tokens to vanish after a hard refresh.
  const secureAttr = isSecure() ? ";Secure" : "";
  document.cookie =
    `${name}=${encodeURIComponent(value)};${expiryCookie(maxAgeSeconds)};path=${COOKIE_PATH};SameSite=Lax${secureAttr}`;
  console.debug("🍪 Cookie written:", { name, length: value.length, secure: isSecure() });
}

/** Remove a cookie by setting it with an already-expired date. */
function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${COOKIE_PATH}`;
}

/* ---- public API (same signatures as before) ---- */

/** Persist a JWT token and its expiry timestamp to cookies. */
export function saveToken(token: string, expiresAt: number): void {
  try {
    // Handle potential BigInt from proto3 int64 deserialization
    const safeExpiry = typeof expiresAt === "bigint" ? Number(expiresAt) : expiresAt;
    writeCookie(TOKEN_COOKIE, token);
    writeCookie(EXPIRY_COOKIE, String(safeExpiry));
    console.log("🔑 Token saved in cookie, expires at", new Date(safeExpiry * 1000).toISOString());
  } catch (e) {
    console.error("Failed to save auth token:", e);
  }
}

/** Load the stored JWT token. */
export function getToken(): string | null {
  return readCookie(TOKEN_COOKIE);
}

/** Load the stored expiry timestamp (unix seconds). */
export function getExpiryTimestamp(): number {
  const val = readCookie(EXPIRY_COOKIE);
  if (!val) {
    console.debug("⚠️ Expiry cookie not found");
    return 0;
  }
  const parsed = Number(val);
  console.debug("🔍 Expiry cookie value:", { raw: val, parsed });
  return parsed;
}

/** Return true if the stored token is still valid (hasn't expired and is well-formed). */
export function isValid(): boolean {
  const expiresAt = getExpiryTimestamp();
  console.debug("🔍 isValid() — expiry check:", {
    expiresAt,
    nowSeconds: Math.floor(Date.now() / 1000),
    graceWindow: 30,
  });
  if (!expiresAt) return false;
  // Allow a 30-second grace window for clock skew / in-flight requests
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (expiresAt <= nowSeconds + 30) return false;

  // Sanity check: JWT must have exactly 3 non-empty dot-separated segments
  const token = getToken();
  console.debug("🔍 isValid() — token check:", {
    hasToken: !!token,
    tokenLength: token?.length ?? 0,
    hasDots: token?.includes(".") ?? false,
  });
  if (!token || !token.includes(".")) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    console.warn("🚫 Stored JWT is malformed — clearing auth");
    clearAuth();
    return false;
  }
  return true;
}

/** Load the full auth data object. Returns null if token is missing or invalid. */
export function loadAuth(): AuthData | null {
  console.debug("🔍 loadAuth() — dumping all cookies:", document.cookie.slice(0, 200));
  const token = getToken();
  console.debug("🔍 loadAuth() — raw token read:", { hasToken: !!token, length: token?.length ?? 0 });
  if (!token || !isValid()) return null;
  return { token, expiresAt: getExpiryTimestamp() };
}

/** Remove all stored auth data. */
export function clearAuth(): void {
  deleteCookie(TOKEN_COOKIE);
  deleteCookie(EXPIRY_COOKIE);
  deleteCookie(EMAIL_COOKIE);
  console.log("🗑️  Auth cleared from cookies");
}

/** Store the logged-in user's email for quick display. */
export function setEmail(email: string): void {
  writeCookie(EMAIL_COOKIE, email);
}

/** Retrieve the stored email. */
export function getEmail(): string | null {
  return readCookie(EMAIL_COOKIE);
}