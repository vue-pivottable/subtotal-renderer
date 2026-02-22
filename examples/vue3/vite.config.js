import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: mode === 'development' ? {
      '@vue-pivottable/subtotal-renderer': path.resolve(__dirname, '../../src/index.js')
    } : {}
  }
}))
