import { Router, type IRouter, type Request, type Response } from "express";
import axios from "axios";
import crypto from "crypto";

const router: IRouter = Router();

const X_CLIENT_ID = process.env["X_CLIENT_ID"] || "";
const X_CLIENT_SECRET = process.env["X_CLIENT_SECRET"] || "";
const CALLBACK_URL = process.env["CALLBACK_URL"] || "http://localhost:3000/api/auth/callback";

const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const X_USER_URL = "https://api.twitter.com/2/users/me";

const SCOPES = ["tweet.read", "tweet.write", "users.read", "like.read", "like.write", "offline.access"];

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

router.get("/login", (req: Request, res: Response) => {
  if (!X_CLIENT_ID) {
    res.status(503).json({ error: "configuration_error", message: "X API credentials not configured. Please set X_CLIENT_ID and X_CLIENT_SECRET environment variables." });
    return;
  }

  const state = crypto.randomBytes(16).toString("hex");
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  (req.session as any).oauth_state = state;
  (req.session as any).code_verifier = codeVerifier;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: X_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const url = `${X_AUTH_URL}?${params.toString()}`;
  res.json({ url, state });
});

router.get("/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state: string };
  const sessionState = (req.session as any).oauth_state;
  const codeVerifier = (req.session as any).code_verifier;

  if (!state || state !== sessionState) {
    res.status(400).json({ error: "invalid_state", message: "OAuth state mismatch. Please try logging in again." });
    return;
  }

  if (!code) {
    res.status(400).json({ error: "missing_code", message: "Authorization code missing." });
    return;
  }

  try {
    const credentials = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString("base64");

    const tokenRes = await axios.post(
      X_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: CALLBACK_URL,
        code_verifier: codeVerifier,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const { access_token, refresh_token } = tokenRes.data;

    const userRes = await axios.get(`${X_USER_URL}?user.fields=profile_image_url,public_metrics`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user = userRes.data.data;

    (req.session as any).access_token = access_token;
    (req.session as any).refresh_token = refresh_token;
    (req.session as any).user = user;
    delete (req.session as any).oauth_state;
    delete (req.session as any).code_verifier;

    res.json({ success: true, user });
  } catch (err: any) {
    console.error("OAuth callback error:", err?.response?.data || err.message);
    res.status(400).json({ error: "auth_failed", message: "Authentication failed. Please try again." });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out successfully" });
  });
});

router.get("/me", (req: Request, res: Response) => {
  const user = (req.session as any).user;
  if (!user) {
    res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    return;
  }
  res.json(user);
});

export default router;
