/** Feldpost-aligned file-size caps (see feldpost/scripts/lint-specs.mjs). */
export const FILE_MAX_WARN = 400;
export const FILE_MAX_ERROR = 600;

export const maintainabilityRules = {
  "max-lines": [
    "warn",
    { max: FILE_MAX_WARN, skipBlankLines: true, skipComments: true },
  ],
  "max-lines-per-function": ["warn", { max: 60 }],
  complexity: ["warn", 15],
};
