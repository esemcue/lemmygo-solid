import { lazy } from "solid-js";
import type { RouteDefinition } from "@solidjs/router";

import Home from "./pages/home";

export const routes: RouteDefinition[] = [
  {
    path: "/",
    component: Home,
  },
  {
    path: "/register",
    component: lazy(() => import("./pages/register")),
  },
  {
    path: "/recipes",
    component: lazy(() => import("./pages/mcp")),
  },
  {
    path: "**",
    component: lazy(() => import("./errors/404")),
  },
];
