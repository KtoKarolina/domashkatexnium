import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Разрешаем и VITE_*, и SUPABASE_* из .env для URL и anon key
  envPrefix: ['VITE_', 'SUPABASE_'],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.E2E_PORT || process.env.VITE_PORT) || 5173,
    strictPort: Boolean(process.env.E2E_PORT),
  },
})
