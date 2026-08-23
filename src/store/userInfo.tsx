import {
  createSignal,
  createContext,
  useContext,
  onMount,
  Accessor,
  Setter,
} from "solid-js";
import { User, Instance } from "./userInfo.types";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { usersClient as UsersClient } from "../../grpc/users.client";
import { UpdateUserRequest, GetUserResponse } from "../../grpc/users";
import { debugInterceptor } from "../utils/debugInterceptor";
import { isValid, loadAuth, getEmail } from "../services/auth";

interface UserInfoContextType {
  userInfo: Accessor<User>;
  setUserInfo: Setter<User>;
  syncUserInfo: (updatedInfo: User) => Promise<void>;
}

const UserInfoContext = createContext<UserInfoContextType | null>(null);

export const UserInfoProvider = (props) => {
  const [userInfo, setUserInfo] = createSignal<User | null>(null);

  const transport = new GrpcWebFetchTransport({
    baseUrl: import.meta.env.VITE_API_BASE_URL || "https://lemmy-api.likwidsage.com/",
    interceptors: [debugInterceptor],
  });
  const usersClient = new UsersClient(transport);

  const syncUserInfo = async (updatedInfo: User) => {
    if (!updatedInfo) return;

    // Guard: don't call backend if there's no valid auth token
    if (!isValid()) {
      console.warn("⚠️  syncUserInfo skipped — no valid auth token");
      setUserInfo(updatedInfo);
      return;
    }

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
    console.log("📤 Raw payload to backend (%d bytes):", rawPayload.length, rawPayload.substring(0, 500) + (rawPayload.length > 500 ? "..." : ""));

    setUserInfo(updatedInfo);
    try {
      const request: UpdateUserRequest = {
        email: updatedInfo.Email,
        userData: JSON.stringify(updatedInfo),
      };
      const response = await usersClient.updateUser(request);
      console.log("✅ User info synced with server:", response);
    } catch (error) {
      console.error("❌ Failed to sync user info:", error);
    }
  };

  // Auto-init: validate stored token on mount, restore user state if valid
  onMount(async () => {
    console.log("🔄 App mounted — validating stored auth...");
    const auth = loadAuth();
    if (!auth) {
      console.warn("⚠️  No valid auth on mount — showing unauthenticated state");
      return;
    }
    console.log("✅ Auth valid on mount. Fetching full user data from backend...");

    // Restore minimal user info from cookies so the UI shows logged-in state immediately
    const storedEmail = getEmail();
    if (storedEmail) {
      setUserInfo({ Email: storedEmail, Password: "", Instances: {} });
      console.log("👤 Restored minimal user info from cookies:", { email: storedEmail });
    }

    // Fetch full user data (including instances) from the backend
    try {
      console.log("📡 Calling getUser...");
      const result = await usersClient.getUser({});
      console.log("📥 GetUser response from backend:", result);
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
          console.error("❌ Failed to parse GetUser response as JSON:", parseErr);
        }
      } else {
        console.warn("⚠️  GetUser response has no message field!");
      }
    } catch (err) {
      console.error("❌ Failed to fetch user data from backend:", err);
      // Keep the minimal cookie-based state if backend fetch fails
    }
  });

  const userValue = {
    userInfo,
    setUserInfo,
    syncUserInfo,
  };

  return (
    <UserInfoContext.Provider value={userValue}>
      {props.children}
    </UserInfoContext.Provider>
  );
};

export const useUserInfo = () => useContext(UserInfoContext);
