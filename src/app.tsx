import { createSignal, type Component, createEffect } from 'solid-js';
import { Link, useRoutes, useLocation, NavLink } from '@solidjs/router';

import { routes } from './routes';

const App: Component = () => {
  const location = useLocation();
  const Route = useRoutes(routes); 

  const [username, setUsername] = createSignal("")
  const [password, setPassword] = createSignal("")

  createEffect(() => {
    console.log(username)
    console.log(password)
  })

  return (
    <div>
    <input type="text" placeholder="username" class="input w-full max-w-xs" onchange={(e) => setUsername(e.target.value)}/>
    <input type="text" placeholder="password" class="input w-full max-w-xs" onChange={(e) => setPassword(e.target.value)}/>
  </div>
  );
};

export default App;
