import { createSignal, type Component, createEffect } from "solid-js";
import { MCPClient } from "mcp-client";

type GreetOutput = {
  greeting: string;
};

const MCPPage: Component = () => {
  const [name, setName] = createSignal("world");
  const [greeting, setGreeting] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [client, setClient] = createSignal<MCPClient | null>(null);

  createEffect(() => {
    const mcpClient = new MCPClient({
      name: "lemmygo-solid",
      version: "0.1.0",
    });
    mcpClient
      .connect({
        type: "httpStream",
        url: "https://lemmy-api.likwidsage.com/mcp/",
      })
      .then(() => {
        setClient(mcpClient);
      })
      .catch((e: any) => {
        setError(e.message || "Failed to connect to MCP server");
      });
  });

  const callGreet = async () => {
    const c = client();
    if (!c) {
      setError("Client not connected");
      return;
    }

    setLoading(true);
    setError(null);
    setGreeting("");
    try {
      const result = await c.callTool({
        name: "greet",
        arguments: {
          name: name(),
        },
      });

      // Extract greeting from the MCP response format
      if (result.content && result.content.length > 0) {
        const textContent = result.content.find((c: any) => c.type === "text");
        if (textContent && textContent.text) {
          setGreeting(String(textContent.text));
        }
      }
    } catch (e: any) {
      setError(e.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 class="text-2xl font-bold mb-4">MCP Greeter</h1>
      <div class="form-control w-full max-w-xs">
        <input
          type="text"
          placeholder="Enter a name"
          class="input input-bordered w-full max-w-xs"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
        />
        <button
          class="btn btn-primary mt-2"
          onClick={callGreet}
          disabled={loading() || !client()}
        >
          {loading() ? <span class="loading loading-spinner"></span> : "Greet"}
        </button>
      </div>
      {greeting() && (
        <div class="alert alert-success mt-4">Greeting: {greeting()}</div>
      )}
      {error() && <div class="alert alert-error mt-4">{error()}</div>}
    </div>
  );
};

export default MCPPage;
