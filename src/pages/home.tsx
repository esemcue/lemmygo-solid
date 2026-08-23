import { Show } from "solid-js";
import { useUserInfo } from "../store/userInfo";
import { getToken, isValid } from "../services/auth";

export default function Home() {
  const context = useUserInfo();

  return (
    <div class="mx-3 my-3">
      <h1 class="text-2xl font-bold mb-4">Home</h1>

      <Show when={context?.userInfo()} keyed>
        {(user) => (
          <div class="card bg-base-200 p-6 max-w-lg">
            <h2 class="text-xl font-semibold mb-3">Welcome back!</h2>
            <p class="mb-2">
              Logged in as: <strong>{user.Email}</strong>
            </p>
            <p class="mb-2">
              Instances configured:{" "}
              <strong>
                {Object.keys(user.Instances ?? {}).length}
              </strong>
            </p>
            <p class="text-sm text-base-content/60">
              Auth token: {getToken() && isValid() ? "✅ Valid" : "❌ Invalid"}
            </p>
          </div>
        )}
      </Show>

      <Show when={!context?.userInfo()}>
        <p class="text-base-content/60">
          Sign in to access your instances and preferences.
        </p>
      </Show>
    </div>
  );
}
