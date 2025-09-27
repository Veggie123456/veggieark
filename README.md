# Noah's Ark Bot

Telegram group bot to rescue animals and build your ark. Built with Telegraf and SQLite/Postgres.

## Commands
- /save — Rescue a random animal
- /animals — See your saved animals
- /arklist — View all possible animals and rarities
- /helpark — Help
- /arkhelp — Help alias

## Setup
1. Copy env and set values:
```bash
cp .env.example .env
# edit .env to set BOT_TOKEN and GROUP_ID
```
2. Install deps:
```bash
npm install
```
3. Run locally:
```bash
npm run dev
```

## Deploy
- Heroku: create app, add `DATABASE_URL` (optional), set `BOT_TOKEN`, `GROUP_ID`. Use Procfile (worker).

## Persistence
- Uses stable Telegram `from.id` as identity. Data stored in SQLite by default; uses Postgres when `DATABASE_URL` is present.
