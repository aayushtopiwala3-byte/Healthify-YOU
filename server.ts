import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // --- API Routes ---

  // Google OAuth URL Generation
  app.get("/api/auth/google/url", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.APP_URL || `http://localhost:${PORT}`}/auth/callback`;
    
    if (!clientId) {
      return res.status(400).json({ error: "GOOGLE_CLIENT_ID not configured" });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    res.json({ url });
  });

  // OAuth Callback Handler
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.send("No code provided");
    }

    // In a real app, you would exchange the code for tokens here.
    // Since the user wants a simple approach and persistence in localStorage,
    // we'll pass the info back to the client.
    
    // Construct simulated user info (in real app, get from Google API using token)
    // For now, we'll just signal success and let the client handle it.
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS',
                payload: { name: 'Google User', email: 'user@gmail.com' } 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // --- Vite / Static Assets ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
