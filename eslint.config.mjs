import js from "@eslint/js";
import next from "eslint-config-next";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "public/r/**", "scratch/**", "node_modules/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  ...next,
);
