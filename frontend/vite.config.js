import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Ajouts spécifiques pour le déploiement
  base: '/', // Important pour Render
  build: {
    outDir: 'dist', // Dossier de build attendu par Render
    emptyOutDir: true, // Nettoie le dossier avant chaque build
    sourcemap: process.env.NODE_ENV !== 'production', // Génère des sourcemaps en dev seulement
  },
  server: {
    port: 5173, // Port par défaut de Vite (utile pour le preview)
    strictPort: true, // Force ce port
  },
  preview: {
    port: 5173 // Port pour 'vite preview'
  }
})