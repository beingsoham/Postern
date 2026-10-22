import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },

  js.configs.recommended,

  {
    rules: {
      // A leading underscore marks a deliberately discarded binding.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Server: Node environment, ES modules.
  {
    files: ['server/**/*.js', 'cli/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Client: browser environment, JSX.
  {
    files: ['client/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // no-undef stays ON here. It was switched off to accommodate the React
    // JSX transform, and in doing so it hid a genuine ReferenceError: a
    // component used two helpers that were never imported, and only crashed
    // in the browser. The transform needs its globals declared, not the rule
    // disabled.
    rules: {},
  },

  // Tests get the Vitest globals-free API, but describe/it come from imports.
  {
    files: ['**/tests/**/*.js', '**/*.test.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
