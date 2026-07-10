/**
 * Shared, Feldpost-aligned lint rules (see feldpost/apps/web/eslint.config.mjs).
 *
 * Goal: keep files small and single-purpose so an agent can open one file, see
 * the whole thing, and change it precisely. The line/complexity caps are the
 * primary lever; the quality rules keep imports and types clean on top.
 */

/** Size + complexity caps — the main "split this file" guidance. */
export const maintainabilityRules = {
  "max-lines": [
    "warn",
    { max: 200, skipBlankLines: true, skipComments: true },
  ],
  "max-lines-per-function": [
    "warn",
    { max: 60, skipBlankLines: true, skipComments: true },
  ],
  complexity: ["warn", 15],
};

/**
 * Numbers that carry their own meaning and don't need a named constant.
 * Mirrors Feldpost's allow-list (durations, powers of two, common sizes).
 */
const operationalNumberGuidance = {
  ignore: [
    0, 1, -1, 2, 8, 60, 90, 120, 180, 300, 360, 1000, 1024, 1500, 3600, 180000,
  ],
  ignoreArrayIndexes: true,
  ignoreDefaultValues: true,
  enforceConst: false,
};

/** Type/import hygiene — auto-fixable, keeps diffs small and intentional. */
export const codeQualityRules = {
  "@typescript-eslint/no-explicit-any": "error",
  "@typescript-eslint/consistent-type-imports": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
  "unused-imports/no-unused-imports": "error",
  "@typescript-eslint/explicit-function-return-type": [
    "warn",
    {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
    },
  ],
  "no-magic-numbers": ["warn", operationalNumberGuidance],
  "no-warning-comments": [
    "warn",
    { terms: ["FIXME", "HACK"], location: "anywhere" },
  ],
};
