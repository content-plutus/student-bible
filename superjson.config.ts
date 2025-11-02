import { defineConfig } from "superjson";

export default defineConfig({
  modules: [
    {
      path: "./src/lib/utils/superjson",
      export: "superjson",
    },
  ],
});
