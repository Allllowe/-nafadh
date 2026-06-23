# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

نَفاذ (Nafadh) is a privacy-tools web app with an Arabic (RTL) UI: a temporary email inbox plus a set of utilities (password generator/checker, username generator, fake-data generator, image compressor/converter, QR generator, Base64/URL encoder, PDF merge). It was refactored from a single combined HTML/CSS/JS file into a separate `frontend/` (static) and `backend/` (Express API). The UI design/behavior is treated as fixed — preserve it when making changes.

## Commands

All backend commands run from `backend/`:

```bash
cd backend
cp .env.example .env      # first-time setup; defaults are fine for local dev
npm install
npm run dev               # nodemon, auto-reload — http://localhost:5000
npm start                 # plain node server.js
```

Health check: `http://localhost:5000/api/health`

Serve the frontend with any static server (do NOT open `index.html` via `file://` — `fetch` behaves differently there):

```bash
cd frontend
npx serve .               # or: python3 -m http.server 5500
```

In production the backend also serves the static frontend itself (see `backend/src/app.js`), so a single deployed Node process covers both.

There are **no tests, linter, or build step** in this repo — `package.json` only defines `start` and `dev`.

## Architecture

### Two key design decisions to preserve

1. **Client-side-only tools are intentional.** Password tools, image compress/convert, QR, Base64, and PDF merge run **entirely in the browser** (`frontend/script.js`) because the UI explicitly promises users these never touch a server. Backend equivalents for QR and Base64 exist under `/api/tools` for external API consumers, but the frontend deliberately does not use them. Do not move these client-side tools to the server.

2. **Frontend has automatic local fallbacks.** Inbox, username generator, and fake-data generator call the Express API but fall back to local demo data if the backend is unreachable (see `usingLocalFallback`), so the page works standalone. When changing API response shapes, update both the server and the matching local fallback in `script.js`.

### Backend layering (`backend/src/`)

Standard route → controller → service split. Controllers handle HTTP (status codes, request parsing); services hold logic. The dependency arrow only points inward: `routes/` → `controllers/` → `services/`, with `config/index.js` reading env vars.

- `server.js` — entry point: reads port from config, starts the listener, handles SIGTERM/SIGINT graceful shutdown (Render sends SIGTERM on deploy).
- `src/app.js` — Express wiring: CORS, JSON body limit, `/api` routes, static frontend serving, and an SPA catch-all that returns `index.html` for non-`/api` paths while leaving unknown `/api` paths to the `notFound` JSON handler.
- `src/services/inbox.service.js` — **the stateful core.** Holds all inboxes in an **in-memory `Map`** (resets on restart, not multi-instance safe). To add persistence, replace only this module with a Redis/DB-backed version exporting the same functions — controllers/routes are storage-agnostic. Key rules enforced here: TTL default 20 min, **hard cap of 60 min total lifetime**, and **only one extension allowed per inbox** (`inbox.extended` flag).

### Inbound mail is not yet wired

Inboxes are seeded with clearly-fake demo messages. `receiveInboundMessage` in `inbox.service.js` (exposed via `POST /api/inbox/:address/messages`, protected by the `X-Webhook-Secret` header matching `INBOUND_WEBHOOK_SECRET`) is the integration point for a real mail provider (Mailgun/SendGrid/Postmark inbound webhooks, or a custom SMTP receiver). Connecting real mail means feeding this function — no frontend changes needed.

### Configuration (`.env`, read in `src/config/index.js`)

`PORT`, `INBOX_DOMAIN`, `INBOX_TTL_MINUTES`, `CORS_ORIGIN` (comma-separated or `*`), `INBOUND_WEBHOOK_SECRET`. On Render, `PORT` and `RENDER_EXTERNAL_URL` are injected automatically. The frontend's API base defaults to `http://localhost:5000/api` and can be overridden at runtime by setting `window.NAFADH_API_BASE` in a `<script>` before `script.js` in `index.html`.

## Conventions

- **Arabic-first:** user-facing strings (UI text, API error messages, toasts) are in Arabic. Code comments are in English or Arabic. Match the surrounding language.
- **XSS safety in the frontend:** all dynamic/user-influenced text is inserted via `textContent`/`createElement`, never `innerHTML` string concatenation. Keep this when adding DOM output.
- **CDN-loaded libraries** (`QRCode`, `PDFLib`) are guarded with `typeof X === 'undefined'` checks because the whole frontend runs in one IIFE — an uncaught error from a blocked CDN would break every other tool. Preserve these guards.
