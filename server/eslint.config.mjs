import js from '@eslint/js'
import globals from 'globals'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { codeQualityRules, maintainabilityRules } from '../eslint.shared.mjs'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      ...maintainabilityRules,
      ...codeQualityRules,
    },
  },
])
