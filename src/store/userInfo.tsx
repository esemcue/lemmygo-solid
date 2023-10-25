import { createSignal, createContext, useContext, createEffect } from "solid-js";

const UserInfoContext = createContext()

export const UserInfoProvider = (props) => {
  const [userInfo, setUserInfo] = createSignal({}),
    user  = [
        userInfo,
        setUserInfo
    ]

  createEffect( () => console.log("user:", userInfo()) )

  return (
    <UserInfoContext.Provider value={user}>
        {props.children}
    </UserInfoContext.Provider>
  )
}

export const useUserInfo = () => useContext(UserInfoContext)

