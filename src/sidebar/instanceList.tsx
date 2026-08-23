import { type Component, For, Show, createSignal } from "solid-js";
import { useUserInfo } from "../store/userInfo";
import { IoAddCircle } from "solid-icons/io";
import { AiFillSave } from "solid-icons/ai";
import { clearAuth } from "../services/auth";

const InstanceList: Component = () => {
  const userContext = useUserInfo();
  if (!userContext) return null;

  const { userInfo, setUserInfo, syncUserInfo } = userContext;

  console.log("🔍 [InstanceList] Rendered — userInfo:", userInfo());

  const [newInstanceName, setNewInstanceName] = createSignal("");
  const [newInstanceUrl, setNewInstanceUrl] = createSignal("");
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [newCredentialKey, setNewCredentialKey] = createSignal("");
  const [newCredentialValue, setNewCredentialValue] = createSignal("");
  const [addingCredentialTo, setAddingCredentialTo] = createSignal<
    string | null
  >(null);

  const handleAddInstance = async () => {
    const currentInstances = userInfo()?.Instances || {};
    // Deep copy: spread the outer map AND each instance's credentials
    const newInstances: Record<string, any> = {};
    for (const [k, v] of Object.entries(currentInstances)) {
      newInstances[k] = { url: v.url, credentials: { ...v.credentials } };
    }
    newInstances[newInstanceName()] = {
      url: newInstanceUrl(),
      credentials: {},
    };
    const updatedUser = { ...userInfo(), Instances: newInstances };
    console.log("📤 [InstanceList] handleAddInstance — sending:", JSON.stringify(updatedUser));
    syncUserInfo(updatedUser);
    //clean up form
    setNewInstanceName("");
    setNewInstanceUrl("");
    setShowAddForm(false);
  };

  const removeInstance = (instanceName: string) => {
    const currentInstances = userInfo()?.Instances || {};
    const newInstances = { ...currentInstances };
    delete newInstances[instanceName];
    syncUserInfo({ ...userInfo(), Instances: newInstances });
  };

  const handleAddCredential = async (
    instanceName: string,
    credentialKey: string,
    credentialValue: string
  ) => {
    console.log(
      "📤 [InstanceList] Adding credential",
      instanceName,
      credentialKey,
      credentialValue
    );
    // Deep copy to avoid mutating original signal state
    const currentInstances = userInfo()?.Instances || {};
    const newInstances: Record<string, any> = {};
    for (const [k, v] of Object.entries(currentInstances)) {
      newInstances[k] = { url: v.url, credentials: { ...v.credentials } };
    }
    if (!newInstances[instanceName]) {
      console.error("❌ [InstanceList] Instance not found:", instanceName);
      return;
    }
    newInstances[instanceName].credentials[credentialKey] = credentialValue;
    const updatedUser = { ...userInfo(), Instances: newInstances };
    console.log("📤 [InstanceList] handleAddCredential — sending:", JSON.stringify(updatedUser));
    syncUserInfo(updatedUser);
    setAddingCredentialTo(null);
    setNewCredentialKey("");
    setNewCredentialValue("");
  };

  const removeCredential = (instanceName: string, credentialKey: string) => {
    console.log("📤 [InstanceList] Removing credential", instanceName, credentialKey);
    const currentInstances = userInfo()?.Instances || {};
    const newInstances: Record<string, any> = {};
    for (const [k, v] of Object.entries(currentInstances)) {
      newInstances[k] = { url: v.url, credentials: { ...v.credentials } };
    }
    delete newInstances[instanceName].credentials[credentialKey];
    syncUserInfo({ ...userInfo(), Instances: newInstances });
  };

  const handleLogout = () => {
    clearAuth();
    // Reset user info so the Login form reappears
    setUserInfo(null);
  };

  return (
    <>
      Logged In As: <h1 class="font-bold mb-3">{userInfo()?.Email}</h1>
      <button onClick={handleLogout} class="btn btn-sm btn-error mb-4">
        Logout
      </button>
      <div class="mb-4">
        <div class="flex items-center mb-2">
          <button
            class="btn btn-sm btn-primary mr-2"
            onClick={() => setShowAddForm(!showAddForm())}
          >
            {showAddForm() ? "Cancel" : "+"}
          </button>
          <h2 class="text-lg font-semibold">Instances</h2>
        </div>

        <Show when={showAddForm()}>
          <div class="card bg-base-200 p-4 mb-4">
            <div class="form-control mb-2">
              <input
                type="text"
                placeholder="Instance name (e.g., lemmy.world)"
                class="input input-bordered input-sm"
                value={newInstanceName()}
                onInput={(e) => setNewInstanceName(e.currentTarget.value)}
              />
            </div>
            <div class="form-control mb-2">
              <input
                type="url"
                placeholder="Instance URL (e.g., https://lemmy.world)"
                class="input input-bordered input-sm"
                value={newInstanceUrl()}
                onInput={(e) => setNewInstanceUrl(e.currentTarget.value)}
              />
            </div>
            <div class="flex gap-2">
              <button
                class="btn btn-sm btn-success"
                onClick={handleAddInstance}
                disabled={!newInstanceName().trim() || !newInstanceUrl().trim()}
              >
                Add
              </button>
              <button
                class="btn btn-sm btn-ghost"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </Show>
      </div>
      <Show when={userInfo()?.Instances}>
        <div class="space-y-3">
          <For each={Object.keys(userInfo()!.Instances)}>
            {(instanceKey) => {
              const instance = userInfo()!.Instances[instanceKey];
              return (
                <div class="card bg-base-100 border p-3">
                  <div class="flex justify-between items-start mb-2 text-center">
                    <button
                      class="btn btn-sm btn-error btn-outline"
                      onClick={() => removeInstance(instanceKey)}
                    >
                      ✕
                    </button>
                    <h3 class="font-medium">{instanceKey}</h3>
                    <p class="text-sm text-base-content/70">{instance.url}</p>
                  </div>

                  <div class="mt-3">
                    <div class="flex justify-between items-center mb-2">
                      <Show when={addingCredentialTo() !== instanceKey}>
                        <button
                          class="btn btn-xs btn-secondary"
                          onClick={() => setAddingCredentialTo(instanceKey)}
                        >
                          <IoAddCircle />
                        </button>
                      </Show>
                      <h4 class="text-sm font-medium">Credentials</h4>
                    </div>

                    <Show when={addingCredentialTo() === instanceKey}>
                      <div class="bg-base-200 p-2 rounded mb-2">
                        <div class="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Username"
                            class="input input-xs input-bordered flex-1"
                            value={newCredentialKey()}
                            onInput={(e) =>
                              setNewCredentialKey(e.currentTarget.value)
                            }
                          />
                        </div>
                        <div class="flex gap-2 mb-2">
                          <input
                            type="text"
                            placeholder="Password"
                            class="input input-xs input-bordered flex-1"
                            value={newCredentialValue()}
                            onInput={(e) =>
                              setNewCredentialValue(e.currentTarget.value)
                            }
                          />
                        </div>
                        <div class="flex gap-1">
                          <button
                            class="btn btn-xs btn-success"
                            onClick={() =>
                              handleAddCredential(
                                addingCredentialTo(),
                                newCredentialKey(),
                                newCredentialValue()
                              )
                            }
                            disabled={
                              !newCredentialKey().trim() ||
                              !newCredentialValue().trim()
                            }
                          >
                            <AiFillSave />
                          </button>
                          <button
                            class="btn btn-xs btn-ghost"
                            onClick={() => setAddingCredentialTo(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </Show>

                    <Show
                      when={
                        Object.keys(
                          userInfo()!.Instances[instanceKey].credentials
                        ).length > 0
                      }
                    >
                      <ul class="space-y-1">
                        <For
                          each={Object.keys(
                            useUserInfo()!.userInfo()!.Instances[instanceKey]
                              .credentials
                          )}
                        >
                          {(credentialKey) => (
                            <li class="flex justify-between items-center text-sm bg-base-200 p-2 rounded">
                              <span>
                                <button
                                  class="btn btn-xs btn-error btn-outline"
                                  onClick={() =>
                                    removeCredential(instanceKey, credentialKey)
                                  }
                                >
                                  ✕
                                </button>
                                <strong>{credentialKey}</strong>{" "}
                              </span>
                            </li>
                          )}
                        </For>
                      </ul>
                    </Show>

                    <Show when={Object.keys(instance.credentials).length === 0}>
                      <p class="text-sm text-base-content/50">
                        No credentials added
                      </p>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
      <Show
        when={
          !userInfo()?.Instances ||
          Object.keys(userInfo()!.Instances).length === 0
        }
      >
        <div class="text-center text-base-content/50 py-8">
          <p>No instances added yet</p>
          <p class="text-sm">Click "Add Instance" to get started</p>
        </div>
      </Show>
    </>
  );
};

export default InstanceList;
