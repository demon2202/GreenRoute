# GreenRoute — API Server

Backend for GreenRoute: eco-friendly route planning, saved places, trip
history, territory games, and the TERRA journey recorder (Strava-style
activity cards). Built with Node.js, Express, MongoDB/Mongoose, Passport,
and Socket.IO.

## Getting started

```bash
npm install
cp .env.example .env     # then fill in the values (see below)
npm start                # or: node server.js
```

The server listens on `PORT` (default `5000`).

## Environment variables

All configuration is read from `server/.env` (see `.env.example`). Never
commit a real `.env`.

| Variable          | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `PORT`            | HTTP port (default `5000`)                                     |
| `NODE_ENV`        | `development` or `production`                                  |
| `MONGO_URI`       | MongoDB connection string                                      |
| `COOKIE_KEY`      | Session-cookie signing secret (32+ chars)                      |
| `TOKEN_SECRET`    | HMAC secret for API bearer tokens (32+ chars)                  |
| `COOKIE_SECURE`   | Send cookies only over HTTPS (`true` in production)            |
| `CLIENT_URL`      | Allowed web origin (CORS + OAuth redirects)                    |
| `SERVER_URL`      | This server's public URL (CORS, CSP, keep-alive, uploads)      |
| `MAPBOX_API_KEY`  | Mapbox access token (route planning)                           |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google sign-in      |
| `ALLOW_SIMULATION`| `true` enables QA route simulation endpoints (dev only)        |

## API outline

- `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout`
- `GET  /api/auth/current_user`
- `GET/POST/DELETE /api/history`, `/api/saved-places`, `/api/preferences`
- `GET  /api/route`, `/api/weather`, `/api/aqi` (Mapbox/weather/AQI proxies)
- `/api/territory/*` — territory capture / attack game endpoints
- `/api/terra/*` — TERRA journeys + media uploads (see below)

### TERRA

- `GET/POST /api/terra/activities` — list / create journeys
- `GET/PATCH/DELETE /api/terra/activities/:id` — read / edit story / delete
- `POST /api/terra/media` — multipart photo upload (max 12 MB, images only)
- `GET /api/terra/tile/:z/:x/:y` — authenticated dark-map tile proxy used by
  the story-card renderer

All `/api` routes require authentication (session cookie **or** `Authorization:
Bearer <token>`). TERRA documents are scoped to the owner — every query
filters by `req.user.id`, so users can never read or mutate another user's
data.

## Security notes

- Passwords are hashed with bcrypt (10 rounds); only Google-account users
  have no password.
- Sessions live in MongoDB via `connect-mongo`; login regenerates the
  session. Cookies are `httpOnly`.
- API bearer tokens are HMAC-SHA256 signed with constant-time comparison
  and expire after 30 days.
- `helmet`, `express-mongo-sanitize`, per-route rate limits, and a strict
  CORS origin allow-list are applied globally.
- Uploaded media is written to `server/uploads/` with random names and is
  served with `nosniff`; never execute.

## Deployment

- Render backend: root directory `server`, start command `npm start`.
- Vercel frontend builds `client/` and rewrites `/api/*` to this server.
- `.github/workflows/keep_alive.yml` pings `/health` so the free tier stays
  warm (not required for local development).
