# NEXUS Backend

Spring Boot REST API using Java 21, Maven, PostgreSQL, JDBC, and Flyway.

## Prerequisites

- Java 21
- Maven 3.9+ (or add the Maven Wrapper)
- PostgreSQL 16+, or Docker with Docker Compose

## Run with Docker Compose

From the repository root:

```bash
docker compose up --build
```

On Windows PowerShell, you can optionally create a local environment file first with `Copy-Item .env.example .env`. The Compose defaults are intended for local development only.

Check the endpoints:

- Liveness: http://localhost:8080/api/v1/health/live
- Readiness (includes PostgreSQL): http://localhost:8080/api/v1/health/ready
- List projects: http://localhost:8080/api/v1/projects

Stop services with `docker compose down`. To also delete the local database volume, use `docker compose down -v`; this permanently deletes local database data.

## Project API (current)

### Create a project

```http
POST /api/v1/projects
Content-Type: application/json

{
  "name": "My architecture",
  "description": "Optional project description"
}
```

Returns HTTP `201 Created` with the project ID and timestamps.

### List projects

```http
GET /api/v1/projects
```

Returns a JSON array, newest projects first.

### Get a project

```http
GET /api/v1/projects/{uuid}
```

Returns HTTP `404` when the project does not exist.

Project names are required and limited to 120 characters. Descriptions are optional and limited to 2,000 characters.

## Run the backend directly

Start PostgreSQL first, then from this directory run:

```bash
mvn spring-boot:run
```

Environment variables:

- `SERVER_PORT` (default `8080`)
- `DB_URL` (default `jdbc:postgresql://localhost:5432/nexus`)
- `DB_USERNAME` (default `nexus`)
- `DB_PASSWORD` (default is for local development only)

Flyway applies SQL migrations from `src/main/resources/db/migration` at startup.

## Tests

```bash
mvn test
```

## Current scope and limitations

Implemented: backend liveness/readiness endpoints, PostgreSQL connectivity, Flyway migrations, and project create/list/get endpoints backed by PostgreSQL.

Not implemented yet: authentication, architecture graph persistence, simulation orchestration, AI explanations, report generation, and frontend integration. The project API is not yet protected by authentication, so keep this development service local and do not expose it to the public internet.
