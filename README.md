# API Portal

Gemini-powered chatbot API with chat and image generation capabilities.

## Quick Start

```bash
cp .env.example .env
# Add GEMINI_API_KEY to .env
docker-compose up --build
```

Server: http://localhost:3000
API Docs: http://localhost:3000/docs

## Database

### Initial Setup
The database initializes automatically on first run via `services/db/init.sql`.

### Run Migrations
To apply schema changes to an existing database:

```bash
# Using Docker (recommended)
docker-compose --profile tools run --rm migrate

# Or directly with psql
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d chat_db -f services/db/init.sql
```

### Reset Database
To completely reset the database:

```bash
docker-compose down -v
docker-compose up -d db
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/items` | List all subscription items (public) |
| `GET /api/items/:id` | Get single item (public) |
| `POST /api/auth/register` | Register new user |
| `POST /api/auth/login` | Login |
| `POST /api/chat/sessions` | Create chat session |

See [docs/README.md](docs/README.md) for full documentation.
"# VieAI_Web" 
