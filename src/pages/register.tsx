import { Show, createSignal } from 'solid-js';
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";
import { UsersClient } from "../../grpc/users.client";
import { RegistrationRequest } from "../../grpc/users";

const PASSWORD_MIN_CHAR = 6;

export default function Register() {
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [repeatPassword, setRepeatPassword] = createSignal("");
  const [error, setError] = createSignal(undefined);

  const transport = new GrpcWebFetchTransport({
    baseUrl: "https://lemmy-api.likwidsage.com/",
  });
  const usersClient = new UsersClient(transport);

  const handleRegister = async () => {
    if (!email()) {
      setError("Email must be set!")
    }

    if (password().length < PASSWORD_MIN_CHAR) {
      console.log(password())
      setError(`Password must be greater than ${PASSWORD_MIN_CHAR} characters!`)
    }

    if (password() !== repeatPassword()){
      console.log(`"${password()}" , "${repeatPassword()}"` )
      setError("Passwords do not match!")
    }

    if (error()) {
      return
    }

    const registerRequest: RegistrationRequest = {
      password: password(),
      email: email()
    };
    const res = await usersClient.register(registerRequest);
    const message = res.response?.message;
    console.log(message)
  }

  return (
    <div class="prose">
        <h1>Register for an account</h1>
        <div class="label-text-alt text-red">{error()}</div>
        <div class="mb-2">
            <label class="label">
                <span class="label-text text-primary">Email</span>
            </label>
            <input name="email" type="email" placeholder="Email" class="input w-full max-w-xs" onInput={(e) => setEmail(e.target.value)}/>
        </div>
        <div class="mb-2">
            <label class="label">
                <span class="label-text text-primary">Password</span>
            </label>
            <input name="password1" type="password" placeholder="Password" class="input w-full max-w-xs" onInput={(e) => setPassword(e.target.value)}/>
        </div>
        <div class="mb-4">
            <label class="label">
                <span class="label-text text-primary">Repeat Password</span>
            </label>
            <input name="password2" type="password" placeholder="Password" class="input w-full max-w-xs" onInput={(e) => setRepeatPassword(e.target.value)}/>
        </div>
        <div>
          <button onClick={handleRegister} class="btn">Register</button>
        </div>
    </div>
  );
}
