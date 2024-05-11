import { Show, createSignal } from "solid-js";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { UsersClient } from "../../grpc/users.client";
import { RegistrationRequest } from "../../grpc/users";

const PASSWORD_MIN_CHAR = 6;

export default function Register() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [repeatPassword, setRepeatPassword] = createSignal("");
  const [success, setSuccess] = createSignal(false);
  const [error, setError] = createSignal(undefined);

  const transport = new GrpcWebFetchTransport({
    baseUrl: "https://lemmy-api.likwidsage.com/",
  });
  const usersClient = new UsersClient(transport);

  const handleRegister = async () => {
    if (!email()) {
      setError("Email must be set!");
    }

    if (password().length < PASSWORD_MIN_CHAR) {
      console.log(password());
      setError(
        `Password must be greater than ${PASSWORD_MIN_CHAR} characters!`
      );
    }

    if (password() !== repeatPassword()) {
      console.log(`"${password()}" , "${repeatPassword()}"`);
      setError("Passwords do not match!");
    }

    if (error()) {
      return;
    }

    const registerRequest: RegistrationRequest = {
      password: password(),
      email: email(),
    };
    console.log(registerRequest);
    try {
      const res = await usersClient.register(registerRequest);
      const message = res.response?.message;
      console.log(message);
      setEmail("");
      setPassword("");
      setRepeatPassword("");
      setError(undefined);
      setSuccess(true);
    } catch (error) {
      setError(error);
      setSuccess(false);
    }
  };

  return (
    <div class="prose">
      <h1>Register for an account</h1>
      <div class="label-text-alt text-red">{error()}</div>
      <div class="mb-2">
        <label class="label">
          <span class="label-text text-primary">Email</span>
        </label>
        <input
          name="email"
          type="email"
          placeholder="Email"
          class="input w-full max-w-xs"
          onInput={(e) => setEmail(e.target.value)}
          value={email()}
        />
      </div>
      <div class="mb-2">
        <label class="label">
          <span class="label-text text-primary">Password</span>
        </label>
        <input
          name="password1"
          type="password"
          placeholder="Password"
          class="input w-full max-w-xs"
          onInput={(e) => setPassword(e.target.value)}
          value={password()}
        />
      </div>
      <div class="mb-4">
        <label class="label">
          <span class="label-text text-primary">Repeat Password</span>
        </label>
        <input
          name="password2"
          type="password"
          placeholder="Password"
          class="input w-full max-w-xs"
          onInput={(e) => setRepeatPassword(e.target.value)}
          value={repeatPassword()}
        />
      </div>
      <div>
        <button onClick={handleRegister} class="btn">
          Register
        </button>
      </div>

      <Show when={success()}>
        <div class="toast">
          <div class="alert alert-info">
            <span>User registration successful</span>
          </div>
        </div>
      </Show>
    </div>
  );
}
