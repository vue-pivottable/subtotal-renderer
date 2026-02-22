import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [vue2()],
  resolve: {
    alias: mode === 'development' ? {
      '@vue-pivottable/subtotal-renderer/vue2': path.resolve(__dirname, '../../src/vue2.js')
    } : {}
  }
}))
