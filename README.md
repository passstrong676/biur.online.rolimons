# Biur Activity

A small, original player-activity dashboard for biur.online. It displays the players reported by your game server, a live online roster, and recent join activity. The visual style is inspired by familiar Roblox community dashboards, without copying Rolimon's branding or assets.

## Connect player join/leave events

This starter uses a Vercel serverless API and Supabase for persistent storage. The UI refreshes every 15 seconds. It does **not** invent or scrape player data: a game/server integration must send join and leave events to the API.

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.
2. In Vercel, add these environment variables and redeploy:
   - `SUPABASE_URL` — your project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` — service-role key; keep this server-only.
   - `INGEST_SECRET` — a long, random secret shared only with your trusted game-server integration.
3. Deploy this repository to Vercel with the repository root as the project root. Vercel serves `index.html` and the `api/players.js` function.
4. From a trusted server, send `POST https://<your-domain>/api/players` with the `x-ingest-key` header and a JSON body such as:

   ```json
   {"event":"join","userId":"123456","playerName":"ExamplePlayer","gameName":"Biur"}
   ```

   Send the same payload with `"event":"leave"` when that player leaves. `GET /api/players` returns the online roster and the latest 200 join/leave events. The dashboard's joins-today statistic is based on those recent events.

For Roblox, use a **server-side** `Players.PlayerAdded` / `Players.PlayerRemoving` integration with `HttpService` enabled; never send the ingest secret in a LocalScript or browser. Store that secret only in trusted server code and rotate it if it is exposed. Use the actual `Player.UserId` and `Player.Name`. The dashboard cannot discover Roblox joins on its own; configure the integration for each game/server you want included.

## Local development

Deploy to Vercel or run the project with Vercel's local development tooling so `/api/players` is available. The dashboard shows an empty state until Supabase is configured and events are ingested.
