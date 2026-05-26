// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'scripts', 'api'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React Hooks linting rules
      ...reactHooks.configs.recommended.rules,
      
      // HMR enforcement rules
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      
      // Hardened TypeScript Rules
      '@typescript-eslint/no-explicit-any': 'warn',           // Warn on 'any' to encourage type definition
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],                                                      // Prevent orphaned state/props
      '@typescript-eslint/no-floating-promises': 'error',     // Ensure all OS / Web Audio promises are caught
      '@typescript-eslint/no-misused-promises': 'error',       // Guard against asynchronous event handlers
      
      // React specific styling rules
      'react/jsx-uses-react': 'off',                           // React 17+ doesn't need explicit import React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',                               // TypeScript handles component models natively!
      
      // Turn off overly aggressive experimental hooks rules
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
    },
  }
);
