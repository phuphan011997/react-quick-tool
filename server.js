import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Local CORS Proxy Middleware
app.use('/local-proxy', (req, res, next) => {
  const urlParam = new URL('http://localhost' + req.url).searchParams.get('url');
  if (!urlParam) {
    res.status(400).send('Missing "url" parameter');
    return;
  }
  next();
}, createProxyMiddleware({
  router: (req) => {
    return new URL('http://localhost' + req.url).searchParams.get('url');
  },
  changeOrigin: true,
  pathRewrite: (path, req) => {
    const urlParam = new URL('http://localhost' + req.url).searchParams.get('url');
    const urlObj = new URL(urlParam);
    return urlObj.pathname + urlObj.search;
  },
  on: {
    proxyRes: (proxyRes) => {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = '*';
    }
  }
}));

app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(5000, () => {
  console.log("App running at http://localhost:5000");
});
