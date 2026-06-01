import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createProxyMiddleware } from 'http-proxy-middleware'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'local-cors-proxy',
      configureServer(server) {
        const proxy = createProxyMiddleware({
          router: (req) => {
            const urlParam = new URL('http://localhost' + (req.url || '')).searchParams.get('url');
            return urlParam || 'http://localhost'; // Fallback to avoid error
          },
          changeOrigin: true,
          pathRewrite: (path, req) => {
            const urlParam = new URL('http://localhost' + (req.url || '')).searchParams.get('url');
            if (!urlParam) return path;
            const urlObj = new URL(urlParam);
            return urlObj.pathname + urlObj.search;
          },
          on: {
            proxyRes: (proxyRes: any) => {
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = '*';
            }
          }
        });
        
        server.middlewares.use('/local-proxy', (req, res, next) => {
          const urlParam = new URL('http://localhost' + (req.url || '')).searchParams.get('url');
          if (!urlParam) {
            res.statusCode = 400;
            res.end('Missing "url" parameter');
            return;
          }
          proxy(req as any, res as any, next);
        });
      }
    }
  ],
})
