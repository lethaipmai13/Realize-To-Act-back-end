import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import db, { initDb } from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
initDb();

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- ORGANIZATIONS ---
  app.get("/api/organizations", (req, res) => {
    try {
      const orgs = db.prepare('SELECT * FROM organizations').all();
      res.json(orgs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/organizations", (req, res) => {
    const { name, org_type, city, state } = req.body;
    try {
      const info = db.prepare('INSERT INTO organizations (name, org_type, city, state) VALUES (?, ?, ?, ?)').run(name, org_type, city, state);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- AUTH & USERS ---
  app.post("/api/signup", (req, res) => {
    const { organization_id, email, password_hash, first_name, last_name, role } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(organization_id, email, password_hash, first_name, last_name, role);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/login", (req, res) => {
    const { email, password } = req.body;
    try {
      // In a real app, hash password and verify
      const user = db.prepare(`
        SELECT u.*, o.name as org_name, o.org_type 
        FROM users u 
        JOIN organizations o ON u.organization_id = o.id 
        WHERE u.email = ?
      `).get(email) as any;
      
      if (user) {
        res.json(user);
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- ITEM TYPES ---
  app.get("/api/item-types", (req, res) => {
    try {
      const types = db.prepare('SELECT * FROM item_types').all();
      res.json(types);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- OFFERS ---
  app.get("/api/offers", (req, res) => {
    try {
      const offers = db.prepare(`
        SELECT o.*, u.first_name, u.last_name, org.name as org_name, it.name as item_name
        FROM offers o
        JOIN users u ON o.user_id = u.id
        JOIN organizations org ON u.organization_id = org.id
        JOIN item_types it ON o.item_type_id = it.id
        ORDER BY o.created_at DESC
      `).all();
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/offers", (req, res) => {
    const { user_id, item_type_id, resource_type, resource_item, quantity_offered, notes } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO offers (user_id, item_type_id, resource_type, resource_item, quantity_offered, notes) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user_id, item_type_id, resource_type, resource_item, quantity_offered, notes);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- REQUESTS ---
  app.get("/api/requests", (req, res) => {
    try {
      const requests = db.prepare(`
        SELECT r.*, u.first_name, u.last_name, org.name as org_name, it.name as item_name
        FROM requests r
        JOIN users u ON r.user_id = u.id
        JOIN organizations org ON u.organization_id = org.id
        JOIN item_types it ON r.item_type_id = it.id
        ORDER BY r.created_at DESC
      `).all();
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/requests", (req, res) => {
    const { user_id, item_type_id, resource_type, resource_item, quantity_requested, notes } = req.body;
    try {
      const info = db.prepare(`
        INSERT INTO requests (user_id, item_type_id, resource_type, resource_item, quantity_requested, notes) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(user_id, item_type_id, resource_type, resource_item, quantity_requested, notes);
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- MATCHES ---
  app.post("/api/matches", (req, res) => {
    const { request_id, offer_id, quantity_matched } = req.body;
    try {
      const offer = db.prepare('SELECT item_type_id FROM offers WHERE id = ?').get(offer_id) as any;
      const info = db.prepare(`
        INSERT INTO matches (request_id, offer_id, item_type_id, quantity_matched) 
        VALUES (?, ?, ?, ?)
      `).run(request_id, offer_id, offer.item_type_id, quantity_matched);
      
      // Update quantities
      db.prepare('UPDATE requests SET quantity_fulfilled = quantity_fulfilled + ? WHERE id = ?').run(quantity_matched, request_id);
      db.prepare('UPDATE offers SET quantity_committed = quantity_committed + ? WHERE id = ?').run(quantity_matched, offer_id);
      
      res.json({ id: info.lastInsertRowid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // OAuth handlers
  app.get("/api/auth/google/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID_PLACEHOLDER',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      access_type: 'offline',
      prompt: 'consent'
    });
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    res.json({ url: authUrl });
  });

  app.get("/api/auth/apple/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`;
    const params = new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID || 'APPLE_CLIENT_ID_PLACEHOLDER',
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      scope: 'name email',
      response_mode: 'form_post'
    });
    const authUrl = `https://appleid.apple.com/auth/authorize?${params}`;
    res.json({ url: authUrl });
  });

  // Unified callback handler
  app.all('/auth/callback', (req, res) => {
    // In a real app, you'd exchange the code for tokens here
    // For this demo, we'll just signal success back to the opener
    res.send(`
      <html>
        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background: #f8fafc;">
          <div style="text-align: center; background: white; padding: 2rem; border-radius: 1rem; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <h2 style="color: #8B4496;">Authentication Successful!</h2>
            <p style="color: #64748b;">This window will close automatically.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                setTimeout(() => window.close(), 1000);
              } else {
                window.location.href = '/';
              }
            </script>
          </div>
        </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
