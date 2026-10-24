import globals from "globals";
export default [
  { ignores: ["apps/web/vendor/**", "contracts/vendor/**", "shared/abi/**"] },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-duplicate-imports": "error",
      "valid-typeof": "error",
      eqeqeq: "error",
    },
  },
];
