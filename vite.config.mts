import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

// Проверяем режим сборки
const isElectron = process.env.ELECTRON === 'true';

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      minify: !isElectron, // Минифицируем только для веба
      inject: {
        data: {
          title: 'Phaser RPG',
          description: 'A Phaser 3 RPG Game',
          // Добавляем мета-теги для корректной работы в Electron
          meta: isElectron ? `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' data:">` : ''
        }
      }
    })
  ],
  
  // КРИТИЧЕСКИ ВАЖНО для Electron:
  base: './', // Относительные пути
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: false, // Отключаем sourcemap для уменьшения размера
    
    // Настройки для Electron (большие файлы, нет inline)
    assetsInlineLimit: 0, // Не инлайним ассеты (оставляем как есть)
    
    rollupOptions: {
      output: {
        // Держим Phaser отдельным файлом
        manualChunks: {
          phaser: ['phaser']
        },
        // Имена файлов без хэшей для стабильности в Electron
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && /\.(png|jpe?g|svg|gif|tiff|bmp|ico|json)$/i.test(assetInfo.name)) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1', // Локальный хост для Electron
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  },
  
  // Оптимизации для производительности
  optimizeDeps: {
    include: ['phaser']
  }
});