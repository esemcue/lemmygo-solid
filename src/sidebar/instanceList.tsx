import {type Component, For } from 'solid-js';
import { useUserInfo } from '../store/userInfo';
import { lemmyInstance, User } from "../store/userInfo.types";

const InstanceList: Component = () => {
  const [userInfo] = useUserInfo();
  return (
    <ul>
      <For each={userInfo().LemmyInstances}>
        {(lemmy: lemmyInstance) => 
          <li>
            {lemmy.Url} - {lemmy.Username} 
          </li>
        }
      </For>
    </ul>
  )
}

export default InstanceList;
