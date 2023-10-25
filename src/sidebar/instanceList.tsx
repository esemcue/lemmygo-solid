import {type Component, For } from 'solid-js';
import { useUserInfo } from '../store/userInfo';

const InstanceList: Component = () => {
  const [userInfo] = useUserInfo();
  return (
    <ul>
      <For each={userInfo().LemmyInstances}>
        {lemmy => 
          <li>
            {lemmy.Url} - {lemmy.Username} 
          </li>
        }
      </For>
    </ul>
  )
}

export default InstanceList;
