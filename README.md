# Global chat

A small multi-instance chat service using Express, Redis Pub/Sub, and Cloud Firestore. Users do not need accounts; the server assigns an anonymous display name when one is not supplied.

## Setup

1. Install Node.js 20+, then run `npm install`.
2. Copy `.env.example` to `.env` and set `FIRESTORE_PROJECT_ID`. Configure Google Application Default Credentials (or set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON path); never commit that file.
3. Start Redis with `docker compose up -d`.
4. Run `npm run dev`, then open http://localhost:3000. `GET /health` reports service configuration.

`npm run build` is the type-check/build validation. Each instance subscribes to the same Redis channel, while every accepted message is stored in Firestore before fan-out.
