# Deployment Setup

## Architecture

This repo now supports a true single-container deployment:

- React frontend build output
- Spring Boot backend API
- MariaDB running inside the same container

For Render, attach a persistent disk to the web service at `/var/lib/mysql`.

## Local Run

Run the whole stack locally:

```bash
docker compose up --build
```

Open:

- app: `http://localhost:8080`

## Render

This repo includes `render.yaml` for the app service with a disk mount.

Set these environment variables on Render:

- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `JWT_SECRET`
- `PORT`

Recommended values:

- `MYSQL_PORT=3306`
- `MYSQL_DATABASE=attendance_system`
- `MYSQL_USER=attendance`
- `MYSQL_PASSWORD=<your password>`
- `MYSQL_ROOT_PASSWORD=<your root password>`
- `JWT_SECRET=<random secret>`
- `PORT=10000`

The container initializes MariaDB on first boot and stores data on the attached disk.
