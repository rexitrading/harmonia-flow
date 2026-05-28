# Harmonia MVP - Plano Rápido (Postgres VPS)

## Meta

Entregar MVP utilizável em produção privada no menor tempo possível.

## Sprint 0 (Dia 1)

- Remover dependência de Supabase/Lovable do runtime.
- Configurar conexão Postgres VPS (`DATABASE_URL`) no backend.
- Aplicar migration `db/migrations/20260528_harmonia_mvp_postgres.sql`.

## Sprint 1 (Dias 2-4)

- Implementar auth interna (login por e-mail/senha + cookie sessão).
- Implementar OAuth Spotify server-side (login/callback/refresh/disconnect).
- Implementar `GET /spotify/me` e `GET /spotify/playlists`.

## Sprint 2 (Dias 5-7)

- CRUD de evento/momento.
- Import de playlist com snapshot local (`imported_playlists` e `imported_playlist_tracks`).
- Geração de `event_tracks` e run sheet.

## Sprint 3 (Dias 8-9)

- Modo execução: status de faixa + logs de execução.
- Destaque atual/próxima/reserva.
- Ações play/pause/complete/skip (inicialmente marcando status e log).

## Sprint 4 (Dia 10)

- Templates/padrões + criação de evento por template.
- Checklist de operação real: reconexão Spotify, latência, falhas de rede.

## Critério de pronto do MVP

- Operador cria sessão ou usa template.
- Importa playlist própria do Spotify.
- Organiza por momentos com notas/cues/backups.
- Executa run sheet e registra histórico operacional.
- Funciona mesmo sem Web Playback SDK.
