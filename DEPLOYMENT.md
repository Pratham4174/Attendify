# Deployment Setup

## Architecture

For Render, the proper setup is:

- one Docker web service for the app
- one separate MariaDB service with persistent storage

The app container already includes:

- React frontend build output
- Spring Boot backend API

The database should not run inside the same Render web container because web containers are not the right place for durable database storage.

## Local Run

Run the whole stack locally:

```bash
docker compose up --build
```

Open:

- app: `http://localhost:8080`

## Render

This repo includes `render.yaml` for the app service.

Set these environment variables on Render:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`

Point them at your MariaDB instance.

If you also want MariaDB on Render, create a separate private service from the official `mariadb` image and attach a persistent disk, or use an external MariaDB provider.
