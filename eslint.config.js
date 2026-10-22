import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },

  js.configs.recommended,

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
    rules: {
      // React 17+ JSX transform needs no React import.
      'no-undef': 'off',
    },
  },

  // Tests get the Vitest globals-free API, but describe/it come from imports.
  {
    files: ['**/tests/**/*.js', '**/*.test.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
