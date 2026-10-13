import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default defineConfig([js.configs.recommended,...ts.configs.recommended,hooks.configs.flat.recommended,{
  files: ['scripts/**/*.cjs'],
  languageOptions: {
    sourceType: 'commonjs',
    globals: { __dirname: 'readonly', process: 'readonly', fetch: 'readonly', setTimeout: 'readonly', console: 'readonly' },
  },
  rules: { '@typescript-eslint/no-require-imports': 'off' },
},globalIgnores(['.next/**','next-env.d.ts','playwright-report/**','test-results/**'])]);

