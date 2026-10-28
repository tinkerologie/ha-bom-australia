import { defineConfig } from "vitest/config";

export default defineConfig({
  build: {
    modulePreload: false,
    outDir: "../custom_components/bom_australia/frontend",
    // The output folder holds only generated files.
    emptyOutDir: true,
    target: "es2022",
    minify: true,
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: { "bom-australia-cards": "src/index.ts" },
      output: { format: "es", entryFileNames: "[name].js" },
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
