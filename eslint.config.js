import tseslint from "typescript-eslint";

export default tseslint.config({ ignores: ["node_modules"] }, ...tseslint.configs.recommended, {
  rules: {
    "no-empty": ["error", { allowEmptyCatch: false }], // no swallowed errors
    "no-console": "warn",
  },
});
