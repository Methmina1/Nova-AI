/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Port & Host configuration
const PORT = 3000;
const HOST = "0.0.0.0";

// Backend proxy configuration.
// All AI chat, employee, and project data is served by the real Backend API
// (see ../Backend). This dev server just proxies /api/* to it and serves the
// React app; it holds no application data or mock logic of its own.
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:5000";

console.log(`Frontend proxy settings: BACKEND_API_URL=${BACKEND_API_URL}`);

async function proxyApiRequest(req, res) {
  const targetUrl = new URL(req.originalUrl, BACKEND_API_URL);

  const headers = { ...req.headers };
  delete headers.host;

  const body = ['GET', 'HEAD'].includes(req.method)
    ? undefined
    : typeof req.body === 'string' || req.body instanceof Buffer
    ? req.body
    : JSON.stringify(req.body || {});

  try {
    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding') return;
      res.setHeader(key, value);
    });

    const responseText = await response.text();
    res.send(responseText);
  } catch (error: any) {
    console.error(`Backend proxy failure for ${req.method} ${req.originalUrl}:`, error?.message || error);
    res.status(502).json({
      error: 'Backend proxy failed',
      details: error?.message || 'Unknown error',
      hint: `Is the Backend API running at ${BACKEND_API_URL}? (cd Backend && npm run dev)`,
    });
  }
}

async function startServer() {
  const app = express();

  // Middleware for parsing requests
  app.use(express.json());

  // Proxy every /api request straight through to the real backend.
  app.use('/api', async (req, res, next) => {
    try {
      await proxyApiRequest(req, res);
    } catch (error) {
      next(error);
    }
  });

  // Serve static files / Configure Vite
  if (process.env.NODE_ENV !== "production") {
    console.log("Integrating Vite Dev Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving compiled production assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Frontend server running at http://localhost:${PORT}`);
    console.log(`Current environment: ${process.env.NODE_ENV || "development"}`);
  });
}

// Start the server
startServer();
