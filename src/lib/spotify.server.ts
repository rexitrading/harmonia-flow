import crypto from "node:crypto";

const AUTH_BASE = "https://accounts.spotify.com";
const API_BASE = "https://api.spotify.com/v1";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function spotifyConfig() {
  return {
    clientId: required("SPOTIFY_CLIENT_ID"),
    clientSecret: required("SPOTIFY_CLIENT_SECRET"),
    redirectUri: required("SPOTIFY_REDIRECT_URI"),
  };
}

export function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

export function getSpotifyAuthorizeUrl(state: string, scope: string) {
  const { clientId, redirectUri } = spotifyConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope,
    redirect_uri: redirectUri,
    state,
    show_dialog: "true",
  });
  return `${AUTH_BASE}/authorize?${params.toString()}`;
}

function basicHeader() {
  const { clientId, clientSecret } = spotifyConfig();
  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${encoded}`;
}

export async function exchangeCodeForToken(code: string) {
  const { redirectUri } = spotifyConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) throw new Error(`Spotify token exchange failed (${res.status})`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch(`${AUTH_BASE}/api/token`, {
    method: "POST",
    headers: {
      Authorization: basicHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) throw new Error(`Spotify token refresh failed (${res.status})`);
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
  };
}

export async function spotifyGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Spotify API request failed (${res.status})`);
  return (await res.json()) as T;
}
