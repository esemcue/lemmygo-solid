import { type Component, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";

import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { UsersClient } from "../../grpc/users.client";
import { LoginRequest } from "../../grpc/users";

import { useUserInfo } from "../store/userInfo";
import InstanceList from "./instanceList";

const Login: Component = () => {
  const [userInfo, setUserInfo] = useUserInfo();
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false)
  const [loginFailed, setLoginFailed] = createSignal(false)

  const transport = new GrpcWebFetchTransport({
    baseUrl: "https://lemmy-api.likwidsage.com/",
  });
  const usersClient = new UsersClient(transport);

  const handleLogin = async () => {
    setLoading(true)
    const loginRequest: LoginRequest = {
      email: email(),
      password: password(),
    };
    try {
      const res = await usersClient.login(loginRequest);
      const message = res.response?.message;
      const user = JSON.parse(message);
      setUserInfo(user);
      setLoginFailed(false)
    } catch (error) {
      setLoginFailed(true)
    }
    setLoading(false)
  };


  return (
    <>
      <Show when={!userInfo() || (Object.keys(userInfo()).length === 0 && !loading()) }>
        <div class="mb-1">
          <input
            type="text"
            placeholder="email"
            class="input w-full max-w-xs"
            onInput={(e) => setEmail(e.target.value)}
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

      <Show when={userInfo() && Object.keys(userInfo()).length > 0}>
        <InstanceList />
      </Show>

      <Show when={loading()}>
        <span class="loading loading-dots loading-lg"></span>
      </Show>

      <Show when={loginFailed()}>
        <div role="alert" class="alert alert-error mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Error logging in</span>
        </div>
      </Show>
    </>
  );
};

export default Login;
