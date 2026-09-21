# Global chat

A small multi-instance chat service using Express, Redis Pub/Sub, and Cloud Firestore. Users do not need accounts; the server assigns an anonymous display name when one is not supplied.

## Setup

1. Install Node.js 20+, then run `npm install`.
2. Copy `.env.example` to `.env`, set unique values for `SESSION_SECRET` and `REDIS_PASSWORD`, and set `FIRESTORE_PROJECT_ID`. Configure Google Application Default Credentials (or set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON path); never commit that file.
3. Start Redis with `docker compose up -d`. Redis binds to localhost only and requires the configured password.
4. Run `npm run dev`, then open http://localhost:3000. In production, set `NODE_ENV=production` and provide `HTTPS_KEY_PATH` and `HTTPS_CERT_PATH`.

Anonymous identities are assigned by the server and signed in an HttpOnly session cookie; client-supplied display names are ignored. `GET /health` returns only a generic status. `npm run build` is the type-check/build validation. Each instance subscribes to the same Redis channel, while every accepted message is stored in Firestore before fan-out.
