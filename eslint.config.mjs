import baseConfig from "@module-foundry/configs/eslint";
import backendConfig from "@module-foundry/configs/eslint/backend";
import reactConfig from "@module-foundry/configs/eslint/frontend/react";
import solidConfig from "@module-foundry/configs/eslint/frontend/solid";

import { hooksOrderRule } from "./scripts/eslint/hooks-order.mjs";

const SOURCE_FILES = ["packages/**/*.{ts,tsx}", "playgrounds/**/*.{ts,tsx}"];
const TEST_FILES = ["tests/**/*.{ts,tsx}", "benchmarks/**/*.{ts,tsx}"];
const REACT_FILES = ["packages/react/**/*.{ts,tsx}", "playgrounds/react/**/*.{ts,tsx}"];
const SOLID_FILES = ["packages/solid/**/*.{ts,tsx}", "playgrounds/solid/**/*.{ts,tsx}"];

const scope = (configs, files) => configs.map(config => ({ ...config, files }));

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "packages/wasm/artifacts/**",
      "packages/wasm/vendor/**",
      "test-results/**",
    ],
  },
  ...baseConfig,
  ...scope(backendConfig.slice(baseConfig.length), SOURCE_FILES),
  ...scope(reactConfig.slice(baseConfig.length), REACT_FILES),
  ...scope(solidConfig.slice(baseConfig.length), SOLID_FILES),
  {
    files: SOURCE_FILES,
    plugins: {
      local: {
        rules: {
          "hooks-order": hooksOrderRule,
        },
      },
    },
    rules: {
      "local/hooks-order": "error",
      "jsdoc/require-returns": "off",
      "max-classes-per-file": ["error", 1],
      "max-lines": ["error", { max: 260, skipComments: true, skipBlankLines: true }],
      "no-magic-numbers": [
        "error",
        {
          enforceConst: true,
          detectObjects: false,
          ignore: [-1, 0, 1, 2],
          ignoreArrayIndexes: true,
        },
      ],
      "perfectionist/sort-imports": [
        "error",
        {
          order: "asc",
          type: "natural",
          newlinesBetween: 1,
          internalPattern: ["^#(?:core|react|solid)/"],
          groups: [
            "side-effect",
            ["value-builtin", "type-builtin"],
            ["value-external", "type-external"],
            ["value-internal", "type-internal"],
            ["value-parent", "type-parent"],
            ["value-sibling", "type-sibling"],
            ["value-index", "type-index"],
          ],
        },
      ],
      "@stylistic/padding-line-between-statements": [
        "error",
        { next: "*", prev: "directive", blankLine: "always" },
        { blankLine: "any", next: "directive", prev: "directive" },
        { next: "*", prev: "import", blankLine: "always" },
        { next: "import", prev: "import", blankLine: "any" },
        {
          blankLine: "always",
          prev: ["const", "let", "var"],
          next: ["block", "block-like", "return", "throw"],
        },
        {
          next: "block-like",
          blankLine: "always",
          prev: ["expression", "multiline-expression"],
        },
        { next: "*", prev: "block-like", blankLine: "always" },
      ],
    },
  },
  {
    files: REACT_FILES,
    rules: {
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: TEST_FILES,
    rules: {
      "no-magic-numbers": "off",
    },
  },
  {
    files: ["packages/**/src/types/**/*.ts"],
    rules: {
      "max-lines": "off",
    },
  },
  {
    files: ["**/*.mjs"],
    rules: {
      "no-undef": "off",
      "no-console": "off",
    },
  },
];
