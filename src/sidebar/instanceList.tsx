import {type Component, For } from 'solid-js';
import { useUserInfo } from '../store/userInfo';
import { User } from "../store/userInfo.types";

const InstanceList: Component = () => {
  const [userInfo] = useUserInfo();
  return (
    <>
      Logged In As: <h1 class='font-bold mb-5'>{userInfo().Email}</h1>
        <For each={Object.keys(userInfo().Instances)}>{(instanceKey) => 
          <>
            <div>{instanceKey}</div>
            <ul>
            <For each={Object.keys(userInfo().Instances[instanceKey])}>{(credentialKey) => 
                <li>{credentialKey}</li>
              }</For>
            </ul>
          </>
        }</For>
    </>
  )
}

export default InstanceList;