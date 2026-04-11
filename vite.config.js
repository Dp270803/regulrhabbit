import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['sanity', '@sanity/vision', 'sanity/structure'],
  },
  define: {
    // Sanity Studio requires process.env to be defined
    'process.env': {},
  },
})
