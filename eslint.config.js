import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  // Base JS rules
  js.configs.recommended,

  // TypeScript rules for all TS/TSX files
  ...tseslint.configs.recommended,

  // React hooks rules applied only to TSX files (avoid eslint-plugin-react crash on .ts)
  {
    files: ['**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },

  // TypeScript-specific overrides
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // Service worker: allow self global
  {
    files: ['src/background/**/*.ts', 'src/workers/**/*.ts'],
    languageOptions: {
      globals: {
        self: 'readonly',
      },
    },
  },
);
