import { createSignal, createContext, useContext, createEffect } from "solid-js";
import { User } from "./userInfo.types";

const UserInfoContext = createContext<User | null>()

export const UserInfoProvider = (props) => {
  const [userInfo, setUserInfo] = createSignal<User | null>(),
    userValue  = [userInfo,setUserInfo]

  createEffect( () => console.log("user:", userInfo()) )

  return (
    <UserInfoContext.Provider value={userValue}>
        {props.children}
    </UserInfoContext.Provider>
  )
}
export const useUserInfo = () => useContext<User | null>(UserInfoContext)

