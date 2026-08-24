import {
  createSignal,
  createContext,
  useContext,
  onMount,
  Accessor,
  Setter,
} from "solid-js";
import { User } from "./userInfo.types";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { usersClient as UsersClient } from "../../grpc/users.client";
import { UpdateUserRequest } from "../../grpc/users";
import { debugInterceptor } from "../utils/debugInterceptor";
import {
  loadAuth,
  getEmail,
  getAccessToken,
  refreshAccessToken,
  clearAuth,
} from "../services/auth";

// Safe console logging: handles both BigInt (from proto3 int64) and circular
// Symbol properties (attached by protobuf-ts via Symbol(message-type)).
function safeStringify(value: unknown, seen = new WeakSet()): string {
  return JSON.stringify(
    value,
    (_key, val) => {
      if (typeof val === "bigint") return Number(val);
      if (typeof val === "symbol") return `<symbol:${val.description ?? ""}>`;
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "<circular>";
        seen.add(val);
      }
      return val;
    },
    2,
  );
}

interface UserInfoContextType {
  userInfo: Accessor<User | null>;
  setUserInfo: Setter<User | null>;
  syncUserInfo: (updatedInfo: User) => Promise<void>;
  logout: () => Promise<void>;
}

const UserInfoContext = createContext<UserInfoContextType | null>(null);

export const UserInfoProvider = (props) => {
  const [userInfo, setUserInfo] = createSignal<User | null>(null);

  // Create a transport that automatically includes the access token
  const createAuthTransport = () => {
    const token = getAccessToken();
    const metadata: Record<string, string> = {};
    if (token) {
      metadata.authorization = `Bearer ${token}`;
    }
    return new GrpcWebFetchTransport({
      baseUrl:
        import.meta.env.VITE_API_BASE_URL ||
        "https://lemmy-api.likwidsage.com/",
      interceptors: [debugInterceptor],
      sendMetadata: metadata,
    });
  };

  const transport = createAuthTransport();
  const usersClient = new UsersClient(transport);

  const syncUserInfo = async (updatedInfo: User) => {
    if (!updatedInfo) return;

    // Debug: log what we're about to send
    const instancesJson = updatedInfo.Instances;
    const instanceKeys = Object.keys(instancesJson || {});
    console.log("📤 syncUserInfo — sending", {
      email: updatedInfo.Email,
      passwordLength: updatedInfo.Password?.length ?? 0,
      instancesCount: instanceKeys.length,
      instanceKeys,
      instancesData: JSON.stringify(instancesJson),
    });

    // Also dump the raw JSON that will be sent to backend
    const rawPayload = JSON.stringify(updatedInfo);
    console.log(
      "📤 Raw payload to backend (%d bytes):",
      rawPayload.length,
      rawPayload.substring(0, 500) + (rawPayload.length > 500 ? "..." : ""),
    );

    setUserInfo(updatedInfo);
    try {
      // Create a fresh transport with the current access token
      const authTransport = createAuthTransport();
      const authClient = new UsersClient(authTransport);

      const request: UpdateUserRequest = {
        email: updatedInfo.Email,
        userData: JSON.stringify(updatedInfo),
      };
      const response = await authClient.updateUser(request);
      console.log(
        "✅ User info synced with server:",
        safeStringify(response),
      );
    } catch (error) {
      console.error(
        "❌ Failed to sync user info:",
        error instanceof Error ? error.message : String(error),
      );
      // If the error is due to an expired token, try refreshing
      const err = error as { code?: number };
      if (err.code === 16) {
        // UNAUTHENTICATED
        console.log("🔄 Token expired during sync, attempting refresh...");
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          console.log("✅ Refreshed token, retrying sync...");
          try {
            const authTransport = createAuthTransport();
            const authClient = new UsersClient(authTransport);
            const request: UpdateUserRequest = {
              email: updatedInfo.Email,
              userData: JSON.stringify(updatedInfo),
            };
            await authClient.updateUser(request);
            console.log("✅ User info synced with server after refresh");
          } catch (retryError) {
            console.error(
              "❌ Failed to sync after refresh:",
              retryError instanceof Error ? retryError.message : String(retryError),
            );
          }
        }
      }
    }
  };

  const logout = async () => {
    const refreshToken = (await import("../services/auth")).getRefreshToken();
    if (refreshToken) {
      try {
        const transport = new GrpcWebFetchTransport({
          baseUrl:
            import.meta.env.VITE_API_BASE_URL ||
            "https://lemmy-api.likwidsage.com/",
          interceptors: [debugInterceptor],
        });
        const client = new UsersClient(transport);
        await client.revokeToken({ refreshToken });
        console.log("✅ Refresh token revoked on server");
      } catch (error) {
        console.warn(
          "⚠️ Failed to revoke refresh token on server:",
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    clearAuth();
    setUserInfo(null);
    console.log("👋 User logged out");
  };

  // Auto-init: validate stored token on mount, restore user state if valid
  onMount(async () => {
    console.log("🔄 App mounted — validating stored auth...");
    const auth = loadAuth();
    if (!auth) {
      console.warn(
        "⚠️  No valid auth on mount — showing unauthenticated state",
      );
      return;
    }
    console.log(
      "✅ Auth valid on mount. Fetching full user data from backend...",
    );

    // Restore minimal user info from cookies so the UI shows logged-in state immediately
    const storedEmail = getEmail();
    if (storedEmail) {
      setUserInfo({ Email: storedEmail, Password: "", Instances: {} });
      console.log("👤 Restored minimal user info from cookies:", {
        email: storedEmail,
      });
    }

    // Fetch full user data (including instances) from the backend
    try {
      console.log("📡 Calling getUser...");
      // Create a fresh transport with current auth token
      const authTransport = createAuthTransport();
      const authClient = new UsersClient(authTransport);
      const result = await authClient.getUser({});
      // protobuf-ts wraps responses: the actual message is at result.response.message
      const messageField = (result as any).response?.message;
      if (messageField) {
        try {
          const fullUser: User = JSON.parse(messageField);
          // Only update if we actually got valid user data back
          if (fullUser && fullUser.Email) {
            console.log("✅ Restored full user data from backend:", {
              email: fullUser.Email,
              instancesKeys: Object.keys(fullUser.Instances || {}),
              instanceCount: Object.keys(fullUser.Instances || {}).length,
              rawInstances: JSON.stringify(fullUser.Instances),
            });
            setUserInfo(fullUser);
          } else {
            console.warn("⚠️  Got user response but missing Email field!");
          }
        } catch (parseErr) {
          console.error(
            "❌ Failed to parse GetUser response as JSON:",
            parseErr instanceof Error ? parseErr.message : String(parseErr),
          );
        }
      } else {
        console.warn("⚠️  GetUser response has no message field!");
      }
    } catch (err) {
      console.error(
        "❌ Failed to fetch user data from backend:",
        err instanceof Error ? err.message : String(err),
      );
      // If the error is due to an expired token, try refreshing
      const error = err as { code?: number };
      if (error.code === 16) {
        // UNAUTHENTICATED
        console.log("🔄 Token expired on mount, attempting refresh...");
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          console.log("✅ Refreshed token, retrying getUser...");
          try {
            const authTransport = createAuthTransport();
            const authClient = new UsersClient(authTransport);
            const result = await authClient.getUser({});
            const messageField = (result as any).response?.message;
            if (messageField) {
              const fullUser: User = JSON.parse(messageField);
              if (fullUser && fullUser.Email) {
                setUserInfo(fullUser);
              }
            }
          } catch (retryErr) {
            console.error(
              "❌ Failed to fetch user data after refresh:",
              retryErr instanceof Error ? retryErr.message : String(retryErr),
            );
          }
        } else {
          console.warn("⚠️ Refresh failed — clearing auth");
          clearAuth();
          setUserInfo(null);
        }
      }
      // Keep the minimal cookie-based state if backend fetch fails
    }
  });

  const userValue = {
    userInfo,
    setUserInfo,
    syncUserInfo,
    logout,
  };

  return (
    <UserInfoContext.Provider value={userValue}>
      {props.children}
    </UserInfoContext.Provider>
  );
};

export const useUserInfo = () => useContext(UserInfoContext);
