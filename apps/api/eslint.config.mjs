import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * ESLint 9 flat config with the same rules the API used under ESLint 8 (the old
 * root .eslintrc.json): eslint:recommended, parsed by @typescript-eslint/parser,
 * with formatting left to Prettier.
 */
export default [
  { ignores: ['build/**', '.adonisjs/**', 'uploads/**'] },
  {
    files: ['**/*.{ts,js,mjs}'],
    ...js.configs.recommended,
  },
  prettier,
  {
    files: ['**/*.{ts,js,mjs}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2021 },
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'warn',
      // TypeScript checks these (tsc --noEmit); the core rules misfire on types.
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
];
