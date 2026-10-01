import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Vite 构建配置。
 * 参数：无（由 Vite CLI 自动加载）。
 * 返回值：Vite 配置对象。
 * 说明：base 使用相对路径，便于部署到 GitHub Pages 的任意子路径。
 */
export default defineConfig({
  base: './',
  // 缓存写入项目内目录，避免依赖目录只读或跨仓库符号链接导致的写入失败。
  cacheDir: './.vite-cache',
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
})
