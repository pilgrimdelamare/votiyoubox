import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174 // puoi cambiarla, basta che non usi 4000/3001/5000/5173
  }
});