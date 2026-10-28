# NEXUS Backend (foundation)

Spring Boot REST API using Java 21, Maven, PostgreSQL, JDBC, and Flyway.

## Prerequisites

- Java 21
- Maven 3.9+ (or add the Maven Wrapper)
- PostgreSQL 16+, or Docker with Docker Compose

## Run with Docker Compose

From the repository root:

```bash
cp .env.example .env
docker compose up --build
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Check the endpoints:

- Liveness: http://localhost:8080/api/v1/health/live
- Readiness (includes PostgreSQL): http://localhost:8080/api/v1/health/ready

Stop services with `docker compose down`. To also delete the local database volume, use `docker compose down -v`; this permanently deletes local database data.

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

This is the first backend foundation only. It provides liveness/readiness endpoints and database connectivity, and verifies that the migration mechanism is configured. The initial migration is a schema bootstrap check, not yet the final application data model. Authentication, project CRUD, architecture persistence, Neo4j, simulation orchestration, AI explanations, and reports are not implemented in this milestone.
