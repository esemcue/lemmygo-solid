/**
 * Auth service helpers for JWT storage, loading, clearing, and expiry checks.
 * Uses cookies to persist tokens across page reloads (accessible from JS).
 *
 * Implements access + refresh token pattern:
 * - Access tokens are short-lived (15 min) and used for API requests
 * - Refresh tokens are long-lived (7 days) and used to obtain new access tokens
 */

const ACCESS_TOKEN_COOKIE = "lemmygo_access_token";
const ACCESS_EXPIRY_COOKIE = "lemmygo_access_expiresAt";
const REFRESH_TOKEN_COOKIE = "lemmygo_refresh_token";
const REFRESH_EXPIRY_COOKIE = "lemmygo_refresh_expiresAt";
const EMAIL_COOKIE = "lemmygo_auth_email";

// Cookie path shared by all auth cookies
const COOKIE_PATH = "/";

// Track refresh in-flight to prevent concurrent refresh calls
let refreshPromise: Promise<boolean> | null = null;

interface AuthData {
  accessToken: string;
  accessExpiresAt: number; // unix seconds
  refreshToken: string;
  refreshExpiresAt: number; // unix seconds
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
  } catch {
    /* noop */
  }
  return false;
}

/** Read a single cookie value by name, or `` if absent. */
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(
      "(^| )(" + name.replace(/[-[\]{}()*+?^.\\|$]/g, "\\$&") + ")=([^;]*)",
    ),
  );
  return match ? decodeURIComponent(match[3]) : null;
}

/** Assign a cookie value. */
function writeCookie(
  name: string,
  value: string,
  maxAgeSeconds = 604800,
): void {
  // Default max-age = 7 days
  const secureAttr = isSecure() ? ";Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)};${expiryCookie(maxAgeSeconds)};path=${COOKIE_PATH};SameSite=Lax${secureAttr}`;
  console.debug("🍪 Cookie written:", {
    name,
    length: value.length,
    secure: isSecure(),
  });
}

/** Remove a cookie by setting it with an already-expired date. */
function deleteCookie(name: string): void {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${COOKIE_PATH}`;
}

/* ---- public API ---- */

/** Persist access token, refresh token, and their expiry timestamps to cookies. */
export function saveTokens(
  accessToken: string,
  accessExpiresAt: number,
  refreshToken: string,
  refreshExpiresAt: number,
): void {
  try {
    // Handle potential BigInt from proto3 int64 deserialization
    const safeAccessExpiry =
      typeof accessExpiresAt === "bigint"
        ? Number(accessExpiresAt)
        : accessExpiresAt;
    const safeRefreshExpiry =
      typeof refreshExpiresAt === "bigint"
        ? Number(refreshExpiresAt)
        : refreshExpiresAt;

    writeCookie(ACCESS_TOKEN_COOKIE, accessToken, safeAccessExpiry);
    writeCookie(
      ACCESS_EXPIRY_COOKIE,
      String(safeAccessExpiry),
      safeAccessExpiry,
    );
    writeCookie(REFRESH_TOKEN_COOKIE, refreshToken, safeRefreshExpiry);
    writeCookie(
      REFRESH_EXPIRY_COOKIE,
      String(safeRefreshExpiry),
      safeRefreshExpiry,
    );

    console.log("🔑 Tokens saved in cookies:", {
      accessExpiresAt: new Date(safeAccessExpiry * 1000).toISOString(),
      refreshExpiresAt: new Date(safeRefreshExpiry * 1000).toISOString(),
    });
  } catch (e) {
    console.error("Failed to save auth tokens:", e instanceof Error ? e.message : String(e));
  }
}

/** Save only the access token when backend doesn't return a refresh token. */
export function saveAccessTokenOnly(
  accessToken: string,
  accessExpiresAt: number | bigint,
): void {
  const safeExpiry = typeof accessExpiresAt === "bigint" ? Number(accessExpiresAt) : accessExpiresAt;
  writeCookie(ACCESS_TOKEN_COOKIE, accessToken, safeExpiry);
  writeCookie(ACCESS_EXPIRY_COOKIE, String(safeExpiry), safeExpiry);
  console.log("🔑 Access token saved in cookies:", {
    accessExpiresAt: new Date(safeExpiry * 1000).toISOString(),
  });
}

/** Load the stored access token. */
export function getAccessToken(): string | null {
  return readCookie(ACCESS_TOKEN_COOKIE);
}

/** Load the stored refresh token. */
export function getRefreshToken(): string | null {
  return readCookie(REFRESH_TOKEN_COOKIE);
}

/** Load the stored access token expiry timestamp (unix seconds). */
export function getAccessExpiryTimestamp(): number {
  const val = readCookie(ACCESS_EXPIRY_COOKIE);
  if (!val) {
    console.debug("⚠️ Access expiry cookie not found");
    return 0;
  }
  return Number(val);
}

/** Load the stored refresh token expiry timestamp (unix seconds). */
export function getRefreshExpiryTimestamp(): number {
  const val = readCookie(REFRESH_EXPIRY_COOKIE);
  if (!val) {
    console.debug("⚠️ Refresh expiry cookie not found");
    return 0;
  }
  return Number(val);
}

/** Return true if the access token is still valid (hasn't expired and is well-formed). */
export function isAccessTokenValid(): boolean {
  const accessExpiresAt = getAccessExpiryTimestamp();
  if (!accessExpiresAt) return false;

  // Allow a 30-second grace window for clock skew / in-flight requests
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (accessExpiresAt <= nowSeconds + 30) return false;

  // Sanity check: JWT must have exactly 3 non-empty dot-separated segments
  const token = getAccessToken();
  if (!token || !token.includes(".")) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    console.warn("🚫 Stored access token is malformed");
    return false;
  }
  return true;
}

/** Return true if the refresh token is still valid. */
export function isRefreshTokenValid(): boolean {
  const refreshExpiresAt = getRefreshExpiryTimestamp();
  if (!refreshExpiresAt) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (refreshExpiresAt <= nowSeconds) return false;

  const token = getRefreshToken();
  if (!token || token.length === 0) return false;

  return true;
}

/**
 * Alias for backward compatibility — checks if access token is valid.
 * Deprecated: Use isAccessTokenValid() instead.
 */
export function isValid(): boolean {
  return isAccessTokenValid();
}

/** Load the full auth data object. Returns null if tokens are missing or invalid. */
export function loadAuth(): AuthData | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken || !refreshToken) return null;
  if (!isAccessTokenValid()) {
    // If access token expired but refresh token is valid, we can still recover
    if (!isRefreshTokenValid()) {
      console.warn("⚠️ Both tokens invalid — clearing auth");
      clearAuth();
      return null;
    }
    // Return partial auth so the refresh flow can kick in
    return {
      accessToken: "",
      accessExpiresAt: 0,
      refreshToken,
      refreshExpiresAt: getRefreshExpiryTimestamp(),
    };
  }

  return {
    accessToken,
    accessExpiresAt: getAccessExpiryTimestamp(),
    refreshToken,
    refreshExpiresAt: getRefreshExpiryTimestamp(),
  };
}

/** Remove all stored auth data. */
export function clearAuth(): void {
  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(ACCESS_EXPIRY_COOKIE);
  deleteCookie(REFRESH_TOKEN_COOKIE);
  deleteCookie(REFRESH_EXPIRY_COOKIE);
  deleteCookie(EMAIL_COOKIE);
  refreshPromise = null;
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

/**
 * Refresh the access token using the stored refresh token.
 * Returns true if refresh was successful.
 * Handles concurrent calls by deduplicating in-flight refresh requests.
 */
export async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for the existing promise
  if (refreshPromise) {
    console.debug("⏳ Refresh already in-flight, waiting...");
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        console.warn("⚠️ No refresh token available");
        return false;
      }

      console.log("🔄 Refreshing access token...");

      // Import dynamically to avoid circular dependencies
      const { GrpcWebFetchTransport } =
        await import("@protobuf-ts/grpcweb-transport");
      const { usersClient: UsersClient } =
        await import("../../grpc/users.client");
      const { debugInterceptor } = await import("../utils/debugInterceptor");

      const transport = new GrpcWebFetchTransport({
        baseUrl:
          import.meta.env.VITE_API_BASE_URL ||
          "https://lemmy-api.likwidsage.com/",
        interceptors: [debugInterceptor],
      });
      const client = new UsersClient(transport);

      const res = await client.refreshToken({ refreshToken });
      const response = res.response;

      if (response?.accessToken && response?.refreshToken) {
        saveTokens(
          response.accessToken,
          Number(response.accessTokenExpiresAt),
          response.refreshToken,
          Number(response.refreshTokenExpiresAt),
        );
        console.log("✅ Access token refreshed successfully");
        return true;
      } else {
        console.warn("⚠️ Refresh response missing tokens");
        return false;
      }
    } catch (error) {
      console.error(
        "❌ Failed to refresh access token:",
        error instanceof Error ? error.message : String(error),
      );
      // If refresh fails, the refresh token may be invalid — clear auth
      clearAuth();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Get a valid access token, refreshing if necessary.
 * Returns null if authentication cannot be recovered.
 */
export async function getValidAccessToken(): Promise<string | null> {
  if (isAccessTokenValid()) {
    return getAccessToken();
  }

  // Try to refresh
  const refreshed = await refreshAccessToken();
  if (refreshed && isAccessTokenValid()) {
    return getAccessToken();
  }

  return null;
}

/* ---- backward compatibility aliases ---- */

/**
 * Alias for saveTokens for backward compatibility.
 * Deprecated: Use saveTokens() instead.
 */
export function saveToken(token: string, expiresAt: number): void {
  // For backward compat, treat as access token only
  writeCookie(ACCESS_TOKEN_COOKIE, token);
  writeCookie(ACCESS_EXPIRY_COOKIE, String(expiresAt));
}

/**
 * Alias for getAccessToken for backward compatibility.
 * Deprecated: Use getAccessToken() instead.
 */
export function getToken(): string | null {
  return getAccessToken();
}

/**
 * Alias for getAccessExpiryTimestamp for backward compatibility.
 * Deprecated: Use getAccessExpiryTimestamp() instead.
 */
export function getExpiryTimestamp(): number {
  return getAccessExpiryTimestamp();
}
