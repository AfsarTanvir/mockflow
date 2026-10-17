import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';

/**
 * ESLint 9 flat config. Next 16 removed `next lint`, so `npm run lint` runs ESLint
 * directly with Next's own core-web-vitals preset.
 */
const config = [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...nextVitals,
  prettier,
  {
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-html-link-for-pages': 'off',
    },
  },
];

export default config;
