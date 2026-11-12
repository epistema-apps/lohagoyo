import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: { exclude: ['tests/regras/**', 'node_modules/**', 'dist/**'] },
});
