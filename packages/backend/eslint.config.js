const js = require('@eslint/js');
const typescript = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: parser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-undef': 'off', // TypeScript handles this
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.js']
  }
];
