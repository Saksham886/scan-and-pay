import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    ".next-owner/**",
    ".next-admin/**",
    ".next-customer/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    // One-off database/maintenance scripts run with tsx, not part of the app build.
    "prisma/**",
    "scripts/**",
  ]),
  {
    rules: {
      // Allow intentionally-unused names when prefixed with an underscore.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
