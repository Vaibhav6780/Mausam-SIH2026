import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHomeRoutes } from './routes/home.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

// The Flutter web build (flutter run -d chrome) serves from a different
// dev-server origin than this API, so it needs CORS enabled to fetch here -
// fine for a local hackathon demo, not something to ship as-is.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

registerHomeRoutes(app);

const webDir = path.resolve(__dirname, '../../../web');
app.use(express.static(webDir));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`mausam-home backend listening on http://localhost:${port}`);
});
