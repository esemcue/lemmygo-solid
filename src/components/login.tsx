import { createSignal, type Component, createEffect } from 'solid-js';

import {GrpcWebFetchTransport} from "@protobuf-ts/grpcweb-transport";
import {UsersClient} from "../../grpc/users.client";
import { LoginRequest, LoginResponse } from "../../grpc/users";

const Login: Component = () => {
  const [username, setUsername] = createSignal("")
  const [password, setPassword] = createSignal("")

  const transport = new GrpcWebFetchTransport({ baseUrl: "http://localhost:8080" })
  const usersClient = new UsersClient(transport);

  const handleLogin = async () => {
    const loginRequest: LoginRequest = {
      name: username(),
      password: password()
    }
    const res = await usersClient.login(loginRequest)
    console.log(res.response)
  }

  return (
    <>
        <div class='mb-1'>
            <input type="text" placeholder="username" class="input w-full max-w-xs" onInput={(e) => setUsername(e.target.value)}/>
        </div>
        <div class='mb-1'>
            <input type="password" placeholder="password" class="input w-full max-w-xs" onInput={(e) => setPassword(e.target.value)}/>
        </div>
        <div>
            <button onClick={handleLogin} class="btn">Login</button>
        </div>
    </>
  );
};

export default Login;
