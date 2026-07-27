import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "scratch/**", "node_modules/**", "src/index.ts"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { URL: "readonly", console: "readonly", process: "readonly" } },
  },
);
