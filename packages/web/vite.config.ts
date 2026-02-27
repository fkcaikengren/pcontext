import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  server: {
    port: 3001,
  },
  plugins: [
    reactRouter(),
    tsconfigPaths(),
    svgr({
      exportAsDefault: true,
      svgrOptions: {
        icon: true,
        memo: true,
        dimensions: false,
      },
    }),
  ],
});

