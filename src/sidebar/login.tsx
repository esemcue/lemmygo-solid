import { type Component, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";

import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { usersClient as UsersClient } from "../../grpc/users.client";
import { LoginRequest } from "../../grpc/users";

import { useUserInfo } from "../store/userInfo";
import InstanceList from "./instanceList";
import { debugInterceptor } from "../utils/debugInterceptor";
import { saveToken, setEmail } from "../services/auth";

const Login: Component = () => {
  const { userInfo, setUserInfo } = useUserInfo();
  const [email, setEmailLocal] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [loginFailed, setLoginFailed] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  const transport = new GrpcWebFetchTransport({
    baseUrl: "https://lemmy-api.likwidsage.com/",
    interceptors: [debugInterceptor],
  });
  const usersClient = new UsersClient(transport);

  const handleLogin = async () => {
    setLoading(true);
    setLoginFailed(false);
    setErrorMessage("");

    const loginRequest: LoginRequest = {
      email: email(),
      password: password(),
    };

    try {
      const res = await usersClient.login(loginRequest);
      const response = res.response;

      // Debug: dump full response to diagnose proto deserialization
      console.log("🔍 Full login response object:", JSON.stringify(response, null, 2));
      console.log("🔍 Response prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(response)));
      console.log("🔍 Token field check:", {
        hasTokenProperty: "token" in (response ?? {}),
        tokenValue: response?.token,
        tokenType: typeof response?.token,
        expiresAtValue: response?.expiresAt,
        expiresAtType: typeof response?.expiresAt,
      });

      // Persist JWT token for future authenticated requests
      if (response?.token && response?.expiresAt) {
        saveToken(response.token, response.expiresAt);
        setEmail(email());
        // Debug: verify token was actually saved
        const verify = localStorage.getItem("lemmygo_auth_token");
        console.log("✅ Login complete - verifying token in localStorage:", {
          saved: !!verify,
          tokenLength: verify ? verify.length : 0,
          allKeys: Object.keys(localStorage),
        });
      } else {
        console.warn("⚠️ Login response missing token or expiresAt!", {
          hasToken: !!response?.token,
          hasExpiresAt: !!response?.expiresAt,
          message: response?.message,
        });
      }

      // Extract user info from the message field (backend returns JSON string)
      const message = response?.message ?? "";
      try {
        const user = JSON.parse(message);
        setUserInfo(user);
      } catch {
        // If message isn't valid JSON, just store a simple object with the email
        setUserInfo({ Email: email(), Instances: {} });
      }

      setLoading(false);
    } catch (error: any) {
      console.error("Login error:", error);
      const msg = error?.details ?? error?.toString() ?? "Unknown login error";
      setErrorMessage(msg);
      setLoginFailed(true);
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <>
      <Show
        when={
          !userInfo() || (Object.keys(userInfo()).length === 0 && !loading())
        }
      >
        <div class="mb-1">
          <input
            type="text"
            placeholder="email"
            class="input w-full max-w-xs"
            value={email()}
            onInput={(e) => setEmailLocal(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div class="mb-1">
          <input
            type="password"
            placeholder="password"
            class="input w-full max-w-xs"
            onInput={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div>
          <button
            onClick={handleLogin}
            class="btn btn-primary"
            disabled={!email() || !password()}
          >
            Login
          </button>
        </div>
        <div class="flex">
          <span>
            <A href="/register">Register</A>
          </span>
          <span class="mr-2 ml-2">|</span>
          <span>Lost Password</span>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Error logging in: {errorMessage()}</span>
        </div>
      </Show>
    </>
  );
};

export default Login;
