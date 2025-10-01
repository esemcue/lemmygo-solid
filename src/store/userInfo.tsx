import {
  createSignal,
  createContext,
  useContext,
  createEffect,
  Accessor,
  Setter,
} from "solid-js";
import { User } from "./userInfo.types";

const UserInfoContext = createContext<{
  userInfo: Accessor<User>;
  setUserInfo: Setter<User>;
} | null>();

export const UserInfoProvider = (props) => {
  const [userInfo, setUserInfo] = createSignal<User | null>(),
    userValue = { userInfo, setUserInfo };

  createEffect(() => console.log("user:", userInfo()));

  return (
    <UserInfoContext.Provider value={userValue}>
      {props.children}
    </UserInfoContext.Provider>
  );
};
export const useUserInfo = () => useContext(UserInfoContext);
