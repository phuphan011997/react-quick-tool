import { createProxyMiddleware } from 'http-proxy-middleware';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default function handler(req, res) {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    res.status(400).send('Missing "url" parameter');
    return;
  }

  const proxy = createProxyMiddleware({
    router: () => targetUrl,
    changeOrigin: true,
    pathRewrite: () => new URL(targetUrl).pathname + new URL(targetUrl).search,
    on: {
      proxyRes: (proxyRes) => {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = '*';
      }
    }
  });

  return proxy(req, res);
}
