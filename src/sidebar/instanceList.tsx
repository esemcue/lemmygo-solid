import { type Component, For, Show, createSignal } from "solid-js";
import { useUserInfo } from "../store/userInfo";
import { TbTrash } from "solid-icons/tb";
import { IoAddCircle } from "solid-icons/io";
import { AiFillSave } from "solid-icons/ai";

const InstanceList: Component = () => {
  const userContext = useUserInfo();
  if (!userContext) return null;

  const { userInfo, syncUserInfo } = userContext;

  const [newInstanceName, setNewInstanceName] = createSignal("");
  const [newInstanceUrl, setNewInstanceUrl] = createSignal("");
  const [showAddForm, setShowAddForm] = createSignal(false);
  const [newCredentialKey, setNewCredentialKey] = createSignal("");
  const [newCredentialValue, setNewCredentialValue] = createSignal("");
  const [addingCredentialTo, setAddingCredentialTo] = createSignal<
    string | null
  >(null);

  const handleAddInstance = async () => {
    const newInstances = { ...userInfo()?.Instances };
    newInstances[newInstanceName()] = {
      url: newInstanceUrl(),
      credentials: {},
    };
    syncUserInfo({ ...userInfo(), Instances: newInstances });
    //clean up form
    setNewInstanceName("");
    setNewInstanceUrl("");
    setShowAddForm(false);
  };

  const removeInstance = (instanceName: string) => {
    const newInstances = { ...userInfo()?.Instances };
    delete newInstances[instanceName];
    syncUserInfo({ ...userInfo(), Instances: newInstances });
  };

  const handleAddCredential = async (
    instanceName: string,
    credentialKey: string,
    credentialValue: string
  ) => {
    console.log(
      "Adding credential",
      instanceName,
      credentialKey,
      credentialValue
    );
    const newUserInfo = { ...userInfo() };
    newUserInfo.Instances[instanceName].credentials[credentialKey] =
      credentialValue;
    syncUserInfo(newUserInfo);
    setAddingCredentialTo(null);
    setNewCredentialKey("");
    setNewCredentialValue("");
  };

  const removeCredential = (instanceName: string, credentialKey: string) => {
    console.log("Removing credential", instanceName, credentialKey);
    const newUserInfo = { ...userInfo() };
    delete newUserInfo.Instances[instanceName].credentials[credentialKey];
    syncUserInfo(newUserInfo);
  };

  return (
    <>
      Logged In As: <h1 class="font-bold mb-3">{userInfo()?.Email}</h1>
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
                      <TbTrash />
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
                                  <TbTrash />1
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
