import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
        // Required for rules that need type information
        project: './tsconfig.app.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // ── Unused vars ────────────────────────────────────────────────────────
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],

      // ── No any ─────────────────────────────────────────────────────────────
      // Prevents future `any` from creeping in. Use `unknown` + type narrowing.
      '@typescript-eslint/no-explicit-any': 'error',

      // ── Import hygiene ─────────────────────────────────────────────────────
      // Enforce `import type` for type-only imports (already the project style).
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],

      // ── Async safety (requires type-aware linting) ─────────────────────────
      // Catch unawaited Promises (e.g. calling an async fn without await).
      '@typescript-eslint/no-floating-promises': ['warn', { ignoreVoid: true }],
      // Prevent async functions in places that expect sync callbacks.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },
  {
    // Plain JS files (service worker, config) — no type-aware rules
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ['public/firebase-messaging-sw.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        firebase: 'readonly',
      },
    },
  },
])
