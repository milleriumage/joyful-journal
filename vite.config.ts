import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiApiKey = env.GEMINI_API_KEY || 'AIzaSyAbiozh1LQ_APZmrncHeyqlt4Xw5CttEiI';
    return {
      server: {
        port: 8080,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiApiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://bfrtyuzcnpukcjncgawx.supabase.co'),
        'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmcnR5dXpjbnB1a2NqbmNnYXd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDY1MDgsImV4cCI6MjA4MTgyMjUwOH0.GHufzZYMZBNgKjm0uug9NuyGiP_yAFim_Lp9gzG5ZBw')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
