import { createSignal, type Component } from "solid-js";

interface Recipe {
  title: string;
  description: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  ingredients: string[];
  instructions: string[];
  tips?: string[];
}

const MCPPage: Component = () => {
  const [data, setData] = createSignal<Recipe | null>(null);
  const [ingredients, setIngredients] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const getRecipe = async (ingredients: string) => {
    const res = await fetch(
      "https://lemmy-api.likwidsage.com/mcp/recipeGeneratorFlow",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            ingredient: ingredients,
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const json = await res.json();
    console.log("Recipe data:", json);
    return json.result;
  };

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRecipe(ingredients());
      setData(result);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div class="form-control w-full max-w-xs">
        <input
          type="text"
          placeholder="Enter ingredients"
          class="input input-bordered w-full max-w-xs"
          value={ingredients()}
          onInput={(e) => setIngredients(e.currentTarget.value)}
        />
        <button
          class="btn btn-primary mt-2"
          onClick={handleClick}
          disabled={loading()}
        >
          {loading() ? (
            <span class="loading loading-spinner"></span>
          ) : (
            "Get Recipe"
          )}
        </button>
      </div>
      {data() && (
        <div class="card bg-base-100 shadow-xl mt-4">
          <div class="card-body">
            <h2 class="card-title text-2xl">{data().title}</h2>
            <p class="text-gray-600">{data().description}</p>

            <div class="flex gap-4 my-2">
              <div class="badge badge-primary">Prep: {data().prepTime}</div>
              <div class="badge badge-secondary">Cook: {data().cookTime}</div>
              <div class="badge badge-accent">Servings: {data().servings}</div>
            </div>

            <div class="divider">Ingredients</div>
            <ul class="list-disc list-inside space-y-1">
              {data().ingredients.map((item) => (
                <li>{item}</li>
              ))}
            </ul>

            <div class="divider">Instructions</div>
            <ol class="list-decimal list-inside space-y-2">
              {data().instructions.map((step) => (
                <li class="mb-2">{step}</li>
              ))}
            </ol>

            {data().tips && data().tips.length > 0 && (
              <>
                <div class="divider">Tips</div>
                <ul class="list-disc list-inside space-y-1">
                  {data().tips.map((tip) => (
                    <li class="text-sm text-gray-600">{tip}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
      {error() && <div class="alert alert-error mt-4">{error()}</div>}
    </div>
  );
};

export default MCPPage;
