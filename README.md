![Backend tests](https://github.com/Peaky164/Expense-Tracker/actions/workflows/backend-tests.yml/badge.svg?branch=sem6-dev)

# Expense Tracker

Full-stack expense tracking system.

- **backend/**: FastAPI, SQLAlchemy, PostgreSQL (Neon)
- **frontend/**: React web app (Vite)
- **mobile/**: React Native (Expo) Android app

## Running the backend with Docker

From the `backend/` folder:

```powershell
docker compose up --build
```

This starts three services:

- `db`: a local PostgreSQL 16 database (fake local credentials only)
- `migrate`: runs `alembic upgrade head` once, creating the tables on an empty database
- `api`: the FastAPI server, which starts only after `migrate` succeeds

The API is then available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

To stop everything and wipe the local database:

```powershell
docker compose down -v
```

## Database migrations (Alembic)

The schema is managed only by Alembic; the app does not create tables itself. From `backend/`, with the virtual environment active and `DATABASE_URL` set (format `postgresql+psycopg://...`):

```powershell
alembic current
alembic upgrade head
alembic check
```

- `alembic current` shows the applied revision.
- `alembic upgrade head` applies pending migrations.
- `alembic check` reports differences between the models and the database.

The hosting plan used for the API cannot run migrations automatically on deploy, so after a schema change, run `alembic upgrade head` manually against the target database. Never commit real connection strings.

## Running the backend tests

From `backend/`, with the virtual environment active:

```powershell
pip install -r requirements-dev.txt
python -m pytest -q
```

Tests use an in-memory SQLite database and fake environment variables, so they never touch a real database. Rate limiting is switched off in the general tests and checked separately in `tests/test_rate_limit.py`.