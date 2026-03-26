import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5181,
    // Permite fallback para a próxima porta livre quando 5181 estiver ocupada
    strictPort: false,
  },
  preview: {
    host: true,
    port: 5181,
  },
});

