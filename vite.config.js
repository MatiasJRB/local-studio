import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      input: {
        studio: fileURLToPath(new URL("./index.html", import.meta.url)),
        player: fileURLToPath(new URL("./player.html", import.meta.url)),
      },
    },
  },
});
