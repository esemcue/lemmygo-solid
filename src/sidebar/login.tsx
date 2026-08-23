import { type Component, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";

import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { usersClient as UsersClient } from "../../grpc/users.client";
import { LoginRequest, GetUserResponse } from "../../grpc/users";

import { useUserInfo } from "../store/userInfo";
import InstanceList from "./instanceList";
import { debugInterceptor } from "../utils/debugInterceptor";
import { saveToken, setEmail, getToken } from "../services/auth";

const Login: Component = () => {
  const { userInfo, setUserInfo } = useUserInfo();
  const [email, setEmailLocal] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [loginFailed, setLoginFailed] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal("");

  const transport = new GrpcWebFetchTransport({
    baseUrl: import.meta.env.VITE_API_BASE_URL || "https://lemmy-api.likwidsage.com/",
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
        // Debug: verify token was actually saved in cookie
        const verify = document.cookie.includes("lemmygo_auth_token");
        console.log("✅ Login complete - verifying token in cookies:", {
          saved: !!verify,
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
        setUserInfo({ Email: email(), Password: "", Instances: {} });
        console.log("⚠️ Login message wasn't valid JSON — setting fallback user info");
      }

      // KEY FIX: Fetch full user data (including instances) after successful login
      // The login response doesn't contain instances, so we need to call getUser
      console.log("📡 Fetching full user data after login...");
      const token = getToken();
      if (token) {
        try {
          // Create a new transport with the auth token for this request
          const authTransport = new GrpcWebFetchTransport({
            baseUrl: import.meta.env.VITE_API_BASE_URL || "https://lemmy-api.likwidsage.com/",
            interceptors: [debugInterceptor],
            sendMetadata: {
              authorization: `Bearer ${token}`,
            },
          });
          const authClient = new UsersClient(authTransport);
          const getUserResp = (await authClient.getUser({}) as unknown) as GetUserResponse;
          console.log("📥 Post-login getUser response:", getUserResp);
          if (getUserResp.message) {
            try {
              const fullUser = JSON.parse(getUserResp.message);
              if (fullUser && fullUser.Email) {
                console.log("✅ Restored full user data after login:", {
                  email: fullUser.Email,
                  instancesKeys: Object.keys(fullUser.Instances || {}),
                  instanceCount: Object.keys(fullUser.Instances || {}).length,
                });
                setUserInfo(fullUser);
              } else {
                console.warn("⚠️ Post-login getUser returned data without Email field");
              }
            } catch (parseErr) {
              console.error("❌ Failed to parse post-login getUser response:", parseErr);
            }
          } else {
            console.warn("⚠️ Post-login getUser response has no message field");
          }
        } catch (fetchErr) {
          console.error("❌ Failed to fetch user data after login:", fetchErr);
          // Keep the fallback user info if fetch fails
        }
      } else {
        console.warn("⚠️ No token available for post-login getUser call");
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
        <>{
          (() => {
            console.log("🔍 Login component showing InstanceList. userInfo:", {
              email: userInfo()?.Email,
              instancesKeys: Object.keys(userInfo()?.Instances || {}),
              instanceCount: Object.keys(userInfo()?.Instances || {}).length,
            });
            return <InstanceList />;
          })()
        }</>
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
