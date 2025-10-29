// Simple HTTP server for Cloud Run
// Serves static files from dist/ and listens on $PORT

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Read PORT from environment (Cloud Run requirement)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// Health check endpoint (required for Cloud Run readiness)
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

// Serve static files from dist/
app.use(express.static(join(__dirname, 'dist')));

// SPA fallback: serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server on 0.0.0.0 (required for Cloud Run)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/healthz`);
});




