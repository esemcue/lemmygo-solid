/**
 * Auth service helpers for JWT storage, loading, clearing, and expiry checks.
 * Uses localStorage to persist the token across page reloads.
 */

const STORAGE_KEY = "lemmygo_auth_token";
const EXPIRY_KEY = "lemmygo_auth_expiresAt";
const EMAIL_KEY = "lemmygo_auth_email";

interface AuthData {
  token: string;
  expiresAt: number; // unix seconds
  email?: string;
}

/** Persist a JWT token and its expiry timestamp to localStorage. */
export function saveToken(token: string, expiresAt: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(EXPIRY_KEY, String(expiresAt));
    console.log("🔑 Token saved, expires at", new Date(expiresAt * 1000).toISOString());
  } catch (e) {
    console.error("Failed to save auth token:", e);
  }
}

/** Load the stored JWT token. */
export function getToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Load the stored expiry timestamp (unix seconds). */
export function getExpiryTimestamp(): number {
  try {
    const val = localStorage.getItem(EXPIRY_KEY);
    return val ? Number(val) : 0;
  } catch {
    return 0;
  }
}

/** Return true if the stored token is still valid (hasn't expired and is well-formed). */
export function isValid(): boolean {
  const expiresAt = getExpiryTimestamp();
  if (!expiresAt) return false;
  // Allow a 30-second grace window for clock skew / in-flight requests
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (expiresAt <= nowSeconds + 30) return false;

  // Sanity check: JWT must have exactly 3 non-empty dot-separated segments
  const token = getToken();
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
  const token = getToken();
  if (!token || !isValid()) return null;
  return { token, expiresAt: getExpiryTimestamp() };
}

/** Remove all stored auth data. */
export function clearAuth(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(EMAIL_KEY);
    console.log("🗑️  Auth cleared from localStorage");
  } catch (e) {
    console.error("Failed to clear auth:", e);
  }
}

/** Store the logged-in user's email for quick display. */
export function setEmail(email: string): void {
  try {
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // non-fatal
  }
}

/** Retrieve the stored email. */
export function getEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}