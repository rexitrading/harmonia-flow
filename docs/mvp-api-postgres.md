# Harmonia MVP API (Postgres VPS)

## Objetivo

API mínima para duas jornadas:

1. Operar playlists próprias com contexto por faixa durante execução.
2. Criar sessão específica ou por padrão/template e colocar na agenda.

## Base URL

- Desenvolvimento local: `/api`
- Produção VPS: `https://SEU_DOMINIO/api`

## Auth interna (sem Supabase)

- `POST /auth/login` -> cria sessão HTTP-only cookie
- `POST /auth/logout` -> invalida sessão
- `GET /auth/me` -> usuário autenticado

## Spotify Auth

- `GET /auth/spotify/login`
- `GET /auth/spotify/callback`
- `POST /auth/spotify/refresh`
- `POST /auth/spotify/disconnect`

## Sessões e agenda

- `GET /events`
- `POST /events`
- `GET /events/:eventId`
- `PATCH /events/:eventId`
- `DELETE /events/:eventId`
- `POST /events/:eventId/schedule` (altera status para `ready` ou `live`)

## Templates/padrões

- `GET /templates`
- `POST /templates`
- `GET /templates/:templateId`
- `PATCH /templates/:templateId`
- `DELETE /templates/:templateId`
- `POST /events/from-template` (cria evento copiando template)

## Momentos

- `GET /events/:eventId/moments`
- `POST /events/:eventId/moments`
- `PATCH /moments/:momentId`
- `DELETE /moments/:momentId`

## Spotify proxy

- `GET /spotify/me`
- `GET /spotify/playlists`
- `GET /spotify/playlists/:spotifyPlaylistId`
- `GET /spotify/playlists/:spotifyPlaylistId/tracks`

## Importação e snapshot

- `POST /events/:eventId/import-playlist`
- `POST /events/:eventId/sync-playlist`

## Faixas operacionais

- `GET /events/:eventId/tracks`
- `PATCH /event-tracks/:eventTrackId`
- `POST /events/:eventId/reorder-tracks`
- `POST /events/:eventId/move-track`

## Execução ao vivo

- `GET /events/:eventId/run-sheet`
- `POST /events/:eventId/execute/:eventTrackId/play`
- `POST /events/:eventId/execute/:eventTrackId/pause`
- `POST /events/:eventId/execute/:eventTrackId/complete`
- `POST /events/:eventId/execute/:eventTrackId/skip`
- `GET /events/:eventId/logs`

## Contratos mínimos críticos

### POST /events

```json
{
  "title": "Casamento Ana e Pedro",
  "event_date": "2026-09-12T18:00:00-04:00",
  "location": "Cuiabá",
  "notes": "Cerimônia ao ar livre"
}
```

### POST /events/from-template

```json
{
  "template_id": "tpl_uuid",
  "title": "Sessão Ordinária Maio",
  "event_date": "2026-05-30T19:00:00-04:00",
  "location": "Templo"
}
```

### PATCH /event-tracks/:eventTrackId

```json
{
  "moment_id": "mom_uuid",
  "order_index": 2,
  "note": "Começar em 00:42",
  "cue_start_ms": 42000,
  "cue_end_ms": 118000,
  "status": "ready",
  "is_backup": false
}
```
