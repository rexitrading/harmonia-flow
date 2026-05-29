import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db.server";
import { useAppSession } from "@/lib/session.server";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "assistant" | "viewer";
};

type SpotifyAccountRow = {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
};

type SpotifyPlaylistItem = {
  is_local?: boolean;
  track?: {
    id?: string | null;
    uri?: string | null;
    name?: string;
    artists?: Array<{ name: string }>;
    album?: { name: string };
    duration_ms?: number;
    preview_url?: string | null;
    external_urls?: { spotify?: string } | null;
    type?: string;
  } | null;
  item?: {
    id?: string | null;
    uri?: string | null;
    name?: string;
    artists?: Array<{ name: string }>;
    album?: { name: string };
    duration_ms?: number;
    preview_url?: string | null;
    external_urls?: { spotify?: string } | null;
    type?: string;
  } | null;
};

function requireUser(session: { data: { userId?: string } }) {
  if (!session.data.userId) throw new Error("Unauthorized");
  return session.data.userId;
}

async function getValidSpotifyAccessToken(userId: string) {
  const { refreshAccessToken } = await import("@/lib/spotify.server");
  const db = getDb();
  const accountRes = await db.query<SpotifyAccountRow>(
    "SELECT id, access_token, refresh_token, token_expires_at FROM spotify_accounts WHERE user_id = $1",
    [userId],
  );
  const account = accountRes.rows[0];
  if (!account) throw new Error("Conta Spotify não conectada");

  const expired = new Date(account.token_expires_at).getTime() <= Date.now() + 15_000;
  if (!expired) return { accountId: account.id, accessToken: account.access_token };

  const refreshed = await refreshAccessToken(account.refresh_token);
  const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await db.query(
    `UPDATE spotify_accounts
     SET access_token = $1,
         refresh_token = COALESCE($2, refresh_token),
         token_expires_at = $3,
         updated_at = now()
     WHERE id = $4`,
    [refreshed.access_token, refreshed.refresh_token ?? null, tokenExpiresAt, account.id],
  );

  return { accountId: account.id, accessToken: refreshed.access_token };
}

async function getPlaybackToken(eventId: string, userId: string) {
  const db = getDb();
  try {
    return await getValidSpotifyAccessToken(userId);
  } catch {
    const owner = await db.query<{ owner_user_id: string }>(
      "SELECT owner_user_id FROM events WHERE id = $1",
      [eventId],
    );
    if (!owner.rows[0]) throw new Error("Evento não encontrado");

    const shareCheck = await db.query(
      "SELECT id FROM event_shares WHERE event_id = $1 AND shared_with_user_id = $2",
      [eventId, userId],
    );
    if (!shareCheck.rows[0] && owner.rows[0].owner_user_id !== userId) {
      throw new Error("Sem acesso ao Spotify do evento");
    }

    try {
      return await getValidSpotifyAccessToken(owner.rows[0].owner_user_id);
    } catch {
      throw new Error(
        "A conta Spotify do proprietário expirou. Solicite que ele desconecte e reconecte o Spotify nas configurações da sessão.",
      );
    }
  }
}

async function fetchPlaylistItems(
  spotifyGet: <T>(path: string, accessToken: string) => Promise<T>,
  accessToken: string,
  playlistId: string,
): Promise<SpotifyPlaylistItem[]> {
  async function fetchFrom(pathBaseWithQuery: string) {
    const all: SpotifyPlaylistItem[] = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const page = await spotifyGet<{ items: SpotifyPlaylistItem[]; next: string | null }>(
        `${pathBaseWithQuery}&limit=${limit}&offset=${offset}`,
        accessToken,
      );
      all.push(...(page.items ?? []));
      if (!page.next) break;
      offset += limit;
    }
    return all;
  }

  const baseItems = `/playlists/${playlistId}/items?market=from_token&additional_types=track`;
  return fetchFrom(baseItems);
}

async function fetchPlaylistMetaFromMe(
  spotifyGet: <T>(path: string, accessToken: string) => Promise<T>,
  accessToken: string,
  playlistId: string,
) {
  let offset = 0;
  const limit = 50;
  while (true) {
    const page = await spotifyGet<{
      items: Array<{
        id: string;
        name: string;
        snapshot_id: string;
        images: Array<{ url: string }>;
        owner: { display_name: string };
      }>;
      next: string | null;
    }>(`/me/playlists?limit=${limit}&offset=${offset}`, accessToken);

    const found = page.items.find((p) => p.id === playlistId);
    if (found) return found;
    if (!page.next) break;
    offset += limit;
  }
  throw new Error("Playlist não encontrada nas playlists da conta conectada.");
}

export const authSignUp = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6) }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();

    const existing = await db.query("SELECT id FROM users WHERE email = $1", [
      data.email.toLowerCase(),
    ]);
    if (existing.rowCount) throw new Error("E-mail já cadastrado");

    const passwordHash = await bcrypt.hash(data.password, 10);
    const result = await db.query<UserRow>(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, role",
      [data.name, data.email.toLowerCase(), passwordHash],
    );
    const user = result.rows[0];

    await session.update({ userId: user.id, email: user.email, name: user.name });
    return { user };
  });

export const authSignIn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email(), password: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();

    const result = await db.query<UserRow & { password_hash: string }>(
      "SELECT id, name, email, role, password_hash FROM users WHERE email = $1",
      [data.email.toLowerCase()],
    );

    const user = result.rows[0];
    if (!user) throw new Error("Credenciais inválidas");

    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new Error("Credenciais inválidas");

    await session.update({ userId: user.id, email: user.email, name: user.name });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  });

export const authSignOut = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useAppSession();
  await session.clear();
  return { ok: true };
});

export const authMe = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const session = await useAppSession();
  if (!session.data.userId) return { user: null };

  const result = await db.query<UserRow>("SELECT id, name, email, role FROM users WHERE id = $1", [
    session.data.userId,
  ]);
  return { user: result.rows[0] ?? null };
});

export const startSpotifyConnection = createServerFn({ method: "POST" }).handler(async () => {
  const { generateState, getSpotifyAuthorizeUrl } = await import("@/lib/spotify.server");
  const session = await useAppSession();
  requireUser(session);

  const state = generateState();
  await session.update({ ...session.data, spotifyState: state });

  const scope = [
    "user-read-email",
    "user-read-private",
    "playlist-read-private",
    "playlist-read-collaborative",
    "streaming",
    "user-modify-playback-state",
    "user-read-playback-state",
  ].join(" ");

  return { authorizeUrl: getSpotifyAuthorizeUrl(state, scope) };
});

export const finalizeSpotifyConnection = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().min(1), state: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { exchangeCodeForToken, spotifyGet } = await import("@/lib/spotify.server");
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    if (!session.data.spotifyState || session.data.spotifyState !== data.state) {
      throw new Error("State do Spotify inválido");
    }

    const token = await exchangeCodeForToken(data.code);
    const me = await spotifyGet<{ id: string; display_name: string | null }>(
      "/me",
      token.access_token,
    );
    const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

    await db.query(
      `INSERT INTO spotify_accounts
      (user_id, spotify_user_id, display_name, access_token, refresh_token, token_expires_at, scope)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id)
      DO UPDATE SET
      spotify_user_id = EXCLUDED.spotify_user_id,
      display_name = EXCLUDED.display_name,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      scope = EXCLUDED.scope,
      updated_at = now()`,
      [
        userId,
        me.id,
        me.display_name,
        token.access_token,
        token.refresh_token,
        tokenExpiresAt,
        token.scope ?? "",
      ],
    );

    await session.update({ ...session.data, spotifyState: undefined });
    return { ok: true };
  });

export const getSpotifyConnectionStatus = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const session = await useAppSession();
  const userId = requireUser(session);

  const result = await db.query(
    "SELECT spotify_user_id, display_name, token_expires_at FROM spotify_accounts WHERE user_id = $1",
    [userId],
  );

  return { connected: !!result.rows[0], account: result.rows[0] ?? null };
});

export const disconnectSpotifyAccount = createServerFn({ method: "POST" }).handler(async () => {
  const db = getDb();
  const session = await useAppSession();
  const userId = requireUser(session);

  await db.query("DELETE FROM spotify_accounts WHERE user_id = $1", [userId]);
  return { ok: true };
});

export const listSpotifyPlaylists = createServerFn({ method: "GET" }).handler(async () => {
  const { spotifyGet } = await import("@/lib/spotify.server");
  const session = await useAppSession();
  const userId = requireUser(session);
  const { accessToken } = await getValidSpotifyAccessToken(userId);

  const me = await spotifyGet<{ id: string }>("/me", accessToken);
  const data = await spotifyGet<{
    items: Array<{
      id: string;
      name: string;
      collaborative: boolean;
      snapshot_id: string;
      images: Array<{ url: string }>;
      owner: { id: string; display_name: string };
      tracks: { total: number };
    }>;
  }>("/me/playlists?limit=50", accessToken);

  return data.items
    .filter((p) => p.owner?.id === me.id || p.collaborative)
    .map((p) => ({
      id: p.id,
      name: p.name,
      tracks: p.tracks,
      owner: p.owner?.display_name ?? null,
      collaborative: p.collaborative,
    }));
});

export const importPlaylistToEvent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ eventId: z.string().uuid(), spotify_playlist_id: z.string().min(5) }))
  .handler(async ({ data }) => {
    const { spotifyGet } = await import("@/lib/spotify.server");
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);
    const { accountId, accessToken } = await getValidSpotifyAccessToken(userId);

    const eventCheck = await db.query(
      "SELECT id FROM events WHERE id = $1 AND owner_user_id = $2",
      [data.eventId, userId],
    );
    if (!eventCheck.rows[0]) throw new Error("Evento não encontrado");

    const playlist = await fetchPlaylistMetaFromMe(
      spotifyGet,
      accessToken,
      data.spotify_playlist_id,
    );

    const tracks = await fetchPlaylistItems(spotifyGet, accessToken, data.spotify_playlist_id);

    const importedPlaylist = await db.query<{ id: string }>(
      `INSERT INTO imported_playlists
      (spotify_account_id, spotify_playlist_id, name, snapshot_id, image_url, owner_name, imported_at, synced_at)
      VALUES ($1, $2, $3, $4, $5, $6, now(), now())
      ON CONFLICT (spotify_account_id, spotify_playlist_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        snapshot_id = EXCLUDED.snapshot_id,
        image_url = EXCLUDED.image_url,
        owner_name = EXCLUDED.owner_name,
        synced_at = now()
      RETURNING id`,
      [
        accountId,
        playlist.id,
        playlist.name,
        playlist.snapshot_id,
        playlist.images?.[0]?.url ?? null,
        playlist.owner?.display_name ?? null,
      ],
    );

    const importedPlaylistId = importedPlaylist.rows[0].id;
    await db.query("DELETE FROM imported_playlist_tracks WHERE imported_playlist_id = $1", [
      importedPlaylistId,
    ]);
    let firstMomentRes = await db.query<{ id: string }>(
      "SELECT id FROM moments WHERE event_id = $1 ORDER BY order_index ASC LIMIT 1",
      [data.eventId],
    );
    if (!firstMomentRes.rows[0]) {
      await db.query("INSERT INTO moments (event_id, name, order_index) VALUES ($1, $2, 0)", [
        data.eventId,
        "Importadas",
      ]);
      firstMomentRes = await db.query<{ id: string }>(
        "SELECT id FROM moments WHERE event_id = $1 ORDER BY order_index ASC LIMIT 1",
        [data.eventId],
      );
    }
    const defaultMomentId = firstMomentRes.rows[0].id;

    const orderRes = await db.query<{ value: number }>(
      "SELECT COALESCE(MAX(order_index), -1) + 1 AS value FROM event_tracks WHERE event_id = $1",
      [data.eventId],
    );
    let nextOrder = orderRes.rows[0].value;

    let importedCount = 0;
    let totalItems = 0;
    let nullTrackItems = 0;
    let localItems = 0;
    let skippedNoId = 0;
    for (let i = 0; i < tracks.length; i += 1) {
      totalItems += 1;
      const row = tracks[i];
      const track = row.track ?? row.item ?? null;
      if (!track) {
        nullTrackItems += 1;
        continue;
      }
      if (row.is_local) {
        localItems += 1;
        continue;
      }
      if (track.type === "episode") continue;

      const fromUrl = track.external_urls?.spotify?.match(/\/track\/([A-Za-z0-9]+)/)?.[1] ?? null;
      const spotifyTrackId = track.id ?? track.uri ?? fromUrl ?? null;
      if (!spotifyTrackId) {
        skippedNoId += 1;
        continue;
      }

      const insertedTrack = await db.query<{ id: string }>(
        `INSERT INTO imported_playlist_tracks
        (imported_playlist_id, spotify_track_id, spotify_uri, track_name, artists_json, album_name, duration_ms, preview_url, original_position)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
        RETURNING id`,
        [
          importedPlaylistId,
          spotifyTrackId,
          track.uri ?? "",
          track.name ?? "Sem título",
          JSON.stringify((track.artists ?? []).map((a) => a.name)),
          track.album?.name ?? null,
          track.duration_ms ?? 0,
          track.preview_url ?? null,
          i,
        ],
      );

      await db.query(
        `INSERT INTO event_tracks
        (event_id, imported_playlist_track_id, moment_id, order_index, display_order, spotify_uri, spotify_url, track_name, artists_json)
        VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8::jsonb)`,
        [
          data.eventId,
          insertedTrack.rows[0].id,
          defaultMomentId,
          nextOrder,
          track.uri ?? null,
          track.external_urls?.spotify ?? null,
          track.name ?? "Sem título",
          JSON.stringify((track.artists ?? []).map((a) => a.name)),
        ],
      );
      nextOrder += 1;
      importedCount += 1;
    }

    if (importedCount === 0) {
      throw new Error(
        `A playlist foi lida, mas nenhuma faixa importável foi encontrada. total=${totalItems}, sem_track=${nullTrackItems}, locais=${localItems}, sem_id=${skippedNoId}`,
      );
    }

    return { ok: true, imported_count: importedCount };
  });

export const getSpotifyDevices = createServerFn({ method: "GET" }).handler(async () => {
  const { spotifyGet } = await import("@/lib/spotify.server");
  const session = await useAppSession();
  const userId = requireUser(session);
  const { accessToken } = await getValidSpotifyAccessToken(userId);

  const data = await spotifyGet<{
    devices: Array<{
      id: string | null;
      is_active: boolean;
      is_private_session: boolean;
      is_restricted: boolean;
      name: string;
      type: string;
      volume_percent: number | null;
    }>;
  }>("/me/player/devices", accessToken);

  return data.devices.filter((d) => !!d.id && !d.is_restricted);
});

export const getEventSpotifyDevices = createServerFn({ method: "GET" })
  .inputValidator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { spotifyGet } = await import("@/lib/spotify.server");
    const session = await useAppSession();
    const userId = requireUser(session);

    let tokenUserId = userId;
    try {
      await getValidSpotifyAccessToken(userId);
    } catch {
      const db = getDb();
      const owner = await db.query<{ owner_user_id: string }>(
        "SELECT owner_user_id FROM events WHERE id = $1",
        [data.eventId],
      );
      if (!owner.rows[0]) throw new Error("Evento não encontrado");
      tokenUserId = owner.rows[0].owner_user_id;
    }

    const { accessToken } = await getValidSpotifyAccessToken(tokenUserId);
    const result = await spotifyGet<{
      devices: Array<{
        id: string | null;
        is_active: boolean;
        is_restricted: boolean;
        name: string;
        type: string;
      }>;
    }>("/me/player/devices", accessToken);
    return result.devices.filter((d) => !!d.id && !d.is_restricted);
  });

export const getSpotifySdkToken = createServerFn({ method: "GET" })
  .inputValidator(z.object({ eventId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const session = await useAppSession();
    const userId = requireUser(session);
    const { accessToken } = data.eventId
      ? await getPlaybackToken(data.eventId, userId)
      : await getValidSpotifyAccessToken(userId);
    return { accessToken };
  });

export const spotifyPlayTrack = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      trackUri: z.string().min(1),
      deviceId: z.string().optional(),
      eventId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { spotifyPut } = await import("@/lib/spotify.server");
    const session = await useAppSession();
    const userId = requireUser(session);
    const { accessToken } = data.eventId
      ? await getPlaybackToken(data.eventId, userId)
      : await getValidSpotifyAccessToken(userId);

    if (data.deviceId) {
      await spotifyPut(`/me/player`, accessToken, {
        device_ids: [data.deviceId],
        play: false,
      });
    }

    const playUrl = data.deviceId
      ? `/me/player/play?device_id=${encodeURIComponent(data.deviceId)}`
      : `/me/player/play`;

    await spotifyPut(playUrl, accessToken, { uris: [data.trackUri] });
    return { ok: true };
  });

export const spotifyPausePlayback = createServerFn({ method: "POST" })
  .inputValidator(z.object({ deviceId: z.string().min(1), eventId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const { spotifyPut } = await import("@/lib/spotify.server");
    const session = await useAppSession();
    const userId = requireUser(session);
    const { accessToken } = data.eventId
      ? await getPlaybackToken(data.eventId, userId)
      : await getValidSpotifyAccessToken(userId);

    await spotifyPut(
      `/me/player/pause?device_id=${encodeURIComponent(data.deviceId)}`,
      accessToken,
    );
    return { ok: true };
  });

export const listEvents = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const session = await useAppSession();
  const userId = requireUser(session);

  const result = await db.query(
    `SELECT e.id, e.title, e.event_date, e.location, e.notes, e.status,
            u.name AS owner_name, false AS shared
     FROM events e
     JOIN users u ON u.id = e.owner_user_id
     WHERE e.owner_user_id = $1

     UNION ALL

     SELECT e.id, e.title, e.event_date, e.location, e.notes, e.status,
            u.name AS owner_name, true AS shared
     FROM event_shares es
     JOIN events e ON e.id = es.event_id
     JOIN users u ON u.id = e.owner_user_id
     WHERE es.shared_with_user_id = $1

     ORDER BY event_date DESC`,
    [userId],
  );
  return result.rows;
});

export const createEvent = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      event_date: z.string().min(1),
      location: z.string().optional(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    const inserted = await db.query<{ id: string }>(
      `INSERT INTO events (owner_user_id, title, event_date, location, notes)
       VALUES ($1, $2, $3::timestamptz, $4, $5)
       RETURNING id`,
      [userId, data.title, data.event_date, data.location ?? null, data.notes ?? null],
    );

    return { id: inserted.rows[0].id };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    await db.query("DELETE FROM events WHERE id = $1 AND owner_user_id = $2", [data.id, userId]);
    return { ok: true };
  });

export const getEventDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    const event = await db.query(
      `SELECT e.id, e.title, e.event_date, e.location, e.notes, e.status
       FROM events e
       WHERE e.id = $1 AND (
         e.owner_user_id = $2
         OR EXISTS (SELECT 1 FROM event_shares WHERE event_id = $1 AND shared_with_user_id = $2)
       )`,
      [data.eventId, userId],
    );
    if (!event.rows[0]) throw new Error("Evento não encontrado");

    const moments = await db.query(
      "SELECT id, name, color, order_index FROM moments WHERE event_id = $1 ORDER BY order_index ASC",
      [data.eventId],
    );

    const tracks = await db.query(
      `SELECT id, moment_id, order_index, track_name, artists_json, spotify_url, spotify_uri, note
       FROM event_tracks
       WHERE event_id = $1
       ORDER BY order_index ASC`,
      [data.eventId],
    );

    return { event: event.rows[0], moments: moments.rows, tracks: tracks.rows };
  });

export const addMoment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ eventId: z.string().uuid(), name: z.string().min(1), color: z.string().optional() }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    const check = await db.query("SELECT id FROM events WHERE id = $1 AND owner_user_id = $2", [
      data.eventId,
      userId,
    ]);
    if (!check.rows[0]) throw new Error("Evento não encontrado");

    const orderRes = await db.query<{ value: number }>(
      "SELECT COALESCE(MAX(order_index), -1) + 1 AS value FROM moments WHERE event_id = $1",
      [data.eventId],
    );
    const orderIndex = orderRes.rows[0].value;

    await db.query(
      "INSERT INTO moments (event_id, name, color, order_index) VALUES ($1, $2, $3, $4)",
      [data.eventId, data.name, data.color ?? null, orderIndex],
    );

    return { ok: true };
  });

export const removeMoment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ momentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getDb();
    await db.query("DELETE FROM moments WHERE id = $1", [data.momentId]);
    return { ok: true };
  });

export const updateMoment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      momentId: z.string().uuid(),
      name: z.string().min(1).optional(),
      orderIndex: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    await db.query(
      `UPDATE moments SET name = COALESCE($2, name), order_index = COALESCE($3, order_index), updated_at = now() WHERE id = $1`,
      [data.momentId, data.name ?? null, data.orderIndex ?? null],
    );
    return { ok: true };
  });

export const addTrack = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      eventId: z.string().uuid(),
      momentId: z.string().uuid(),
      track_name: z.string().min(1),
      artist: z.string().optional(),
      spotify_url: z.string().url(),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const orderRes = await db.query<{ value: number }>(
      "SELECT COALESCE(MAX(order_index), -1) + 1 AS value FROM event_tracks WHERE event_id = $1",
      [data.eventId],
    );
    const orderIndex = orderRes.rows[0].value;

    await db.query(
      `INSERT INTO event_tracks (event_id, moment_id, order_index, display_order, track_name, artists_json, spotify_url, note)
       VALUES ($1, $2, $3, $3, $4, $5::jsonb, $6, $7)`,
      [
        data.eventId,
        data.momentId,
        orderIndex,
        data.track_name,
        JSON.stringify(data.artist ? [data.artist] : []),
        data.spotify_url,
        data.note ?? null,
      ],
    );

    return { ok: true };
  });

export const removeTrack = createServerFn({ method: "POST" })
  .inputValidator(z.object({ trackId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getDb();
    await db.query("DELETE FROM event_tracks WHERE id = $1", [data.trackId]);
    return { ok: true };
  });

export const updateEventTrack = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      trackId: z.string().uuid(),
      momentId: z.string().uuid().nullable().optional(),
      note: z.string().nullable().optional(),
      orderIndex: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    const ownership = await db.query(
      `SELECT et.id
       FROM event_tracks et
       JOIN events e ON e.id = et.event_id
       WHERE et.id = $1 AND e.owner_user_id = $2`,
      [data.trackId, userId],
    );
    if (!ownership.rows[0]) throw new Error("Faixa não encontrada");

    await db.query(
      `UPDATE event_tracks
       SET moment_id = COALESCE($2, moment_id),
           note = COALESCE($3, note),
           order_index = COALESCE($4, order_index),
           updated_at = now()
       WHERE id = $1`,
      [data.trackId, data.momentId ?? null, data.note ?? null, data.orderIndex ?? null],
    );

    return { ok: true };
  });

export const shareEvent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ eventId: z.string().uuid(), targetEmail: z.string().email() }))
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    const target = await db.query<{ id: string }>("SELECT id FROM users WHERE email = $1", [
      data.targetEmail,
    ]);
    if (!target.rows[0]) throw new Error("Usuário não encontrado");
    if (target.rows[0].id === userId) throw new Error("Você não pode compartilhar consigo mesmo");

    const own = await db.query("SELECT id FROM events WHERE id = $1 AND owner_user_id = $2", [
      data.eventId,
      userId,
    ]);
    if (!own.rows[0]) throw new Error("Evento não encontrado");

    await db.query(
      `INSERT INTO event_shares (event_id, shared_with_user_id)
       VALUES ($1, $2) ON CONFLICT (event_id, shared_with_user_id) DO NOTHING`,
      [data.eventId, target.rows[0].id],
    );

    return { ok: true };
  });

export const removeShare = createServerFn({ method: "POST" })
  .inputValidator(z.object({ eventId: z.string().uuid(), targetUserId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    await db.query(
      `DELETE FROM event_shares
       WHERE event_id = $1 AND shared_with_user_id = $2
       AND EXISTS (SELECT 1 FROM events WHERE id = $1 AND owner_user_id = $3)`,
      [data.eventId, data.targetUserId, userId],
    );

    return { ok: true };
  });

export const listEventShares = createServerFn({ method: "GET" })
  .inputValidator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getDb();
    const session = await useAppSession();
    const userId = requireUser(session);

    const rows = await db.query(
      `SELECT u.id, u.name, u.email, es.role, es.created_at
       FROM event_shares es
       JOIN users u ON u.id = es.shared_with_user_id
       WHERE es.event_id = $1
       AND EXISTS (SELECT 1 FROM events WHERE id = $1 AND owner_user_id = $2)`,
      [data.eventId, userId],
    );

    return rows.rows;
  });

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const session = await useAppSession();
  const userId = requireUser(session);

  const rows = await db.query(
    `SELECT id, name, email FROM users WHERE id != $1 ORDER BY name ASC`,
    [userId],
  );
  return rows.rows;
});
