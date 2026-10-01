/**
 * Vitest 独立配置：与 Vite 构建配置解耦，避免 Vite 版本类型冲突。
 * 创建者：zhenghq
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  cacheDir: './.vite-cache',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
})
