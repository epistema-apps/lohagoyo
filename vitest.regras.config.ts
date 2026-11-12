import { defineConfig } from 'vitest/config';

// Testes das regras do Firestore/Storage. Rodam dentro do emulador (npm run test:regras).
export default defineConfig({
  test: { include: ['tests/regras/**/*.test.ts'], testTimeout: 20000, fileParallelism: false },
});
