import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "import/no-cycle": ["error", { maxDepth: 10 }],
      // Disable the standard rules to avoid duplicates
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Remove unused imports automatically
      "unused-imports/no-unused-imports": "error",
      // Remove unused variables automatically (except those starting with _)
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
