import { createSignal, type Component, createEffect } from 'solid-js';
import {UsersClient} from "../../grpc/users.client";

const Login: Component = () => {
  const [username, setUsername] = createSignal("")
  const [password, setPassword] = createSignal("")

  const userService = new UsersClient("http://localhost:8080");

  const handleClick = () => {
    console.log({
        username: username(),
        password: password()
    })
  }

  return (
    <>
        <div class='mb-1'>
            <input type="text" placeholder="username" class="input w-full max-w-xs" onInput={(e) => setUsername(e.target.value)}/>
        </div>
        <div class='mb-1'>
            <input type="text" placeholder="password" class="input w-full max-w-xs" onInput={(e) => setPassword(e.target.value)}/>
        </div>
        <div>
            <button onClick={handleClick} class="btn">Login</button>
        </div>
    </>
  );
};

export default Login;
