import {type Component, For } from 'solid-js';
import { useUserInfo } from '../store/userInfo';
import { lemmyInstance, User } from "../store/userInfo.types";

const InstanceList: Component = () => {
  const [userInfo] = useUserInfo();
  return (
    <>
      Logged In As: <h1 class='font-bold mb-5'>{userInfo().Email}</h1>
      <ul>
        <For each={userInfo().LemmyInstances}>
          {(lemmy: lemmyInstance) => 
            <li>
              {lemmy.Url} - {lemmy.Username} 
            </li>
          }
        </For>
      </ul>
    </>
  )
}

export default InstanceList;
