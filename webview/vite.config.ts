import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import sveltePreprocess from "svelte-preprocess"
import tailwind from "tailwindcss";
import nested from "postcss-nested";
import autoprefixer from "autoprefixer";
import { join } from "path";

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: join(process.cwd(), "src") }],
  },
  define: {
    "__APP_ENV__": JSON.stringify(process.env.NODE_ENV),
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        postcss: {
          plugins: [nested(), tailwind(), autoprefixer()],
        },
        replace: [
          ["process.env.NODE_ENV", JSON.stringify(process.env.NODE_ENV)],
        ]
      }),
    }),
  ],
  build: {
    outDir: join(process.cwd(), "..", "extension", "dist"),
    emptyOutDir: false,
    cssMinify: true,
    lib: {
      entry: join(process.cwd(), "src", "index.ts"),
      name: "index",
      fileName: (format) => `webview.${format}.js`,
    },
  },
});