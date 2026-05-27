module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // Disabled: conflicts with Prettier's ASI defense (leading semicolons).
    // Prettier owns formatting; ESLint should not fight it.
    // TODO(W1): replace with `eslint-config-prettier` when refactoring lint setup.
    'no-extra-semi': 'off',
  },
  ignorePatterns: ['dist/', 'node_modules/'],
}
