import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'prisma/generated/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      // Se usa import/no-duplicates (compatible con imports de tipo) en lugar
      // del core no-duplicate-imports, que choca con consistent-type-imports.
      'no-duplicate-imports': 'off',
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    // Scripts de seed, utilidades CLI y el logger pueden usar consola
    files: [
      'prisma/**/*.ts',
      'src/lib/utils/logger.ts',
      '**/*.js',
      '**/*.mjs',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Scripts sueltos en CommonJS (utilidades de desarrollo)
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Archivos de configuración pueden usar require()
    files: ['**/*.config.{ts,js,mjs}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Archivos de test (los tipos de jest aún no están instalados)
    files: ['src/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
];

export default eslintConfig;
