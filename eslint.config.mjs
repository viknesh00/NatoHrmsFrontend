import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default tseslint.config(
  { ignores: ['build/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  { files: ["**/*.mjs"], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  // TypeScript source files — full type-aware rules + browser globals
  { files: ['**/*.{ts,tsx}'], languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.vitest } }, plugins: { 'react-hooks': hooks }, rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],
  } },
  { files: ['**/*.test.{ts,tsx}'], languageOptions: { globals: globals.vitest } },
  // Legacy .js / .jsx files — browser globals, plain JS rules, TypeScript-specific rules disabled.
  // These files use browser APIs (document, window, Blob, navigator) and the
  // short-circuit callback pattern `onChange && onChange(value)` which the TS
  // unused-expressions rule incorrectly flags as a statement expression.
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': hooks },
    rules: {
      // Disable TS-specific rules — they don't apply to plain JS
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // Plain JS equivalents
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);
