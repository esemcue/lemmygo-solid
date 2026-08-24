import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    solidPlugin(),
    nodePolyfills(),
  ],
  server: {
    host: '::',       // dual-stack: listens on both IPv4 (0.0.0.0) and IPv6 (::)
    port: 3000,
    strictPort: true,
  },
  build: {
    target: "esnext",
  },
});
