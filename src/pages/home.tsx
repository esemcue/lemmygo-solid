import { createSignal } from "solid-js";

export default function Home() {
  const [count, setCount] = createSignal(0);

  return <div class="mx-3 my-3">Home</div>;
}
