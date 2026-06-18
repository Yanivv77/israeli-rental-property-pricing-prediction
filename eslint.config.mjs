import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native flat configs — no FlatCompat shim needed.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "next-env.d.ts",
      "scripts/smoke/**",
      ".claude/**", // installed third-party skills — not app source
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Stub signatures keep their documented params (prefixed `_`) until the
      // real implementations land in prompts 02/03.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
