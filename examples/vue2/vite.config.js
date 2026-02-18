import { defineConfig } from 'vite'
import vue2 from '@vitejs/plugin-vue2'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue2()],
  resolve: {
    alias: {
      '@vue-pivottable/subtotal-renderer/vue2': resolve(__dirname, '../../src/vue2.js'),
      '@vue-pivottable/subtotal-renderer': resolve(__dirname, '../../src/vue2.js')
    }
  }
})
