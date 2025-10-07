import {
  createSignal,
  createContext,
  useContext,
  createEffect,
  Accessor,
  Setter,
} from "solid-js";
import { User, Instance } from "./userInfo.types";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { usersClient as UsersClient } from "../../grpc/users.client";
import { UpdateUserRequest } from "../../grpc/users";
import { debugInterceptor } from "../utils/debugInterceptor";

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
