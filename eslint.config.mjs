import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = nextCoreWebVitals.map((config) => {
  if (config.name === "next") {
    return {
      ...config,
      rules: {
        ...config.rules,
        "react/no-unescaped-entities": "warn",
        "@next/next/no-img-element": "warn",
        "jsx-a11y/alt-text": "warn",
      },
    };
  }

  if (config.name === "next/typescript") {
    return {
      ...config,
      rules: {
        ...config.rules,
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
      },
    };
  }

  return config;
});

const config = [
  ...eslintConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "public/**",
      "test_dist.mjs",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
