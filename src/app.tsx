import { type Component } from "solid-js";
import { useRoutes, useLocation, A } from "@solidjs/router";

import { routes } from "./routes";
import Home from "./pages/home";
import Login from "./sidebar/login";
import { UserInfoProvider } from "./store/userInfo";

const App: Component = () => {
  const location = useLocation();
  const Route = useRoutes(routes);

  return (
    <UserInfoProvider>
      <div class="drawer lg:drawer-open">
        <label for="my-drawer" class="btn btn-primary drawer-button">
          Open drawer
        </label>
        <input id="my-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content ml-3 mt-3">
          <Route>
            <Home />
          </Route>
        </div>
        <div class="drawer-side">
          <label for="my-drawer" class="drawer-overlay"></label>
          <ul class="menu p-4 w-80 h-full bg-base-200 text-base-content">
            <li>
              <A href="/">Home</A>
            </li>
            <li>
              <A href="/recipes">Recipes</A>
            </li>
            <div class="divider"></div>
            <Login />
          </ul>
        </div>
      </div>
    </UserInfoProvider>
  );
};

export default App;
