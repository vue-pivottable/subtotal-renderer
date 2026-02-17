import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.js'),
        vue2: resolve(__dirname, 'src/vue2.js'),
        core: resolve(__dirname, 'src/core/index.js')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'mjs' : 'js'
        return `${entryName}.${ext}`
      }
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['vue', 'vue-pivottable'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-pivottable': 'VuePivottable'
        },
        preserveModules: false,
        chunkFileNames: '[name].js'
      }
    },
    minify: false,
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
