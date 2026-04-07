import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Разрешаем и VITE_*, и SUPABASE_* из .env для URL и anon key
  envPrefix: ['VITE_', 'SUPABASE_'],
})
