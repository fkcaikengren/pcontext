import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: 'esm',
  dts: true,
  sourcemap: false,
  clean: true,
  external: ['zod', 'es-toolkit'],
})
