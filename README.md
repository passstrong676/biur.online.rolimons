# Biur Activity

An original player and inventory dashboard for biur.online, with a live online roster, recent joins, and reported player RAP and value. It uses a familiar community-dashboard layout, but not Rolimon's branding or assets.

## Connect player and inventory data

This project uses a Vercel serverless API and Supabase. It does not scrape Roblox, discover biur.online players by itself, or invent inventory totals. Your trusted game-server integration must submit each player's data. Roblox does not provide this project with arbitrary players' private inventory contents; only report RAP/value from a source your integration is authorized to access.

1. Run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL Editor. It also adds RAP/value columns to an existing installation.
2. Add these Vercel environment variables and redeploy:
   - `SUPABASE_URL` — your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — service-role key; keep server-only.
   - `INGEST_SECRET` — a long, random secret known only to your trusted integration.
3. Deploy the repository root to Vercel. The page refreshes its dashboard every 15 seconds.
4. From a trusted server, send `POST https://<your-domain>/api/players` with the `x-ingest-key` header and a JSON body like:

   ```json
   {"event":"join","userId":"123456","playerName":"ExamplePlayer","gameName":"Biur","rap":1200,"value":1500}
   ```

   `rap` and `value` are non-negative integer totals from your trusted data source, in Robux/Roblox value units; use `null` when unavailable. Send a corresponding `"event":"leave"` when the player leaves, including fresh RAP/value if available. `GET /api/players` returns the online players and latest 200 join/leave events.

For Roblox, use a server-side `Players.PlayerAdded` / `Players.PlayerRemoving` integration with `HttpService` enabled. Never put the ingest secret in a LocalScript or browser. Store it only in trusted server code and rotate it if exposed. Use the actual `Player.UserId` and `Player.Name`. The Roblox integration must obtain inventory RAP/value from a permitted and reliable source; this app does not claim to fetch or verify that information automatically. Add integrations only for games/servers you control or have permission to monitor.

## Local development

Use Vercel's local development tooling so `/api/players` is available. The dashboard shows an empty state until Supabase is configured and real player events are ingested.
