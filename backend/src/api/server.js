import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerHomeRoutes } from './routes/home.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
registerHomeRoutes(app);

const webDir = path.resolve(__dirname, '../../../web');
app.use(express.static(webDir));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`mausam-home backend listening on http://localhost:${port}`);
});
