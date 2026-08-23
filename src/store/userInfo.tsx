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
import { UpdateUserRequest } from "../../grpc/users";
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
    baseUrl: "https://lemmy-api.likwidsage.com/",
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
    
    setUserInfo(updatedInfo);
    try {
      const request: UpdateUserRequest = {
        email: updatedInfo.Email,
        userData: JSON.stringify(updatedInfo),
      };
      const response = await usersClient.updateUser(request);
      console.log("User info synced with server:", response);
    } catch (error) {
      console.error("Failed to sync user info:", error);
    }
  };

  // Auto-init: validate stored token on mount, restore user state if valid
  onMount(() => {
    console.log("🔄 App mounted — validating stored auth...");
    const auth = loadAuth();
    if (!auth) {
      console.warn("⚠️  No valid auth on mount — showing unauthenticated state");
      return;
    }
    console.log("✅ Auth valid on mount. Token will be attached to outgoing gRPC calls.");

    // Restore minimal user info from cookies so the UI shows logged-in state
    const storedEmail = getEmail();
    if (storedEmail) {
      setUserInfo({ Email: storedEmail, Password: "", Instances: {} });
      console.log("👤 Restored user info from cookies:", { email: storedEmail });
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
