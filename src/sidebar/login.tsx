import { type Component, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";

import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { UsersClient } from "../../grpc/users.client";
import { LoginRequest } from "../../grpc/users";

import { useUserInfo } from "../store/userInfo";
import InstanceList from "./instanceList";

const Login: Component = () => {
  const [userInfo, setUserInfo] = useUserInfo();
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");

  const transport = new GrpcWebFetchTransport({
    baseUrl: "https://lemmy-api.likwidsage.com/",
  });
  const usersClient = new UsersClient(transport);

  const handleLogin = async () => {
    const loginRequest: LoginRequest = {
      name: username(),
      password: password(),
    };
    const res = await usersClient.login(loginRequest);
    const message = res.response?.message;
    const user = JSON.parse(message);
    setUserInfo(user);
  };

  return (
    <>
      <Show when={Object.keys(userInfo()).length === 0}>
        <div class="mb-1">
          <input
            type="text"
            placeholder="username"
            class="input w-full max-w-xs"
            onInput={(e) => setUsername(e.target.value)}
          />
        </div>
        <div class="mb-1">
          <input
            type="password"
            placeholder="password"
            class="input w-full max-w-xs"
            onInput={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <button onClick={handleLogin} class="btn">Login</button>
        </div>
        <div class="flex">
          <span>
            <A href="/register">Register</A>
          </span>
          <span class="mr-2 ml-2">
            |
          </span>
          <span>
            Lost Password
          </span>
        </div>
      </Show>

      <Show when={Object.keys(userInfo()).length > 0}>
        <InstanceList />
      </Show>
    </>
  );
};

export default Login;
