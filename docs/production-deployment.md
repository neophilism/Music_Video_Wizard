# Production deployment

PR 44 packages Music Video Wizard as one reproducible Docker image and declares separate Render web and worker services.

## Why Docker

The production worker needs Node.js, FFmpeg, Python, and the music-analysis Python dependencies. A shared image keeps the web and worker on the same application and Prisma build.

## Service topology

`render.yaml` declares:

1. **music-video-wizard-web** — public Next.js service, health-checked at `/api/health`, with Prisma migrations in Render's pre-deploy phase.
2. **music-video-wizard-worker** — long-running background worker consuming the Postgres-backed pg-boss queue and executing analysis, generation, and FFmpeg renders.

Both services use the same Dockerfile and database.

## Required production infrastructure

Set `DATABASE_URL` to production PostgreSQL.

Production must use shared S3-compatible object storage:

- `ASSET_STORAGE_DRIVER=s3`
- `ASSET_STORAGE_BUCKET`
- `ASSET_STORAGE_REGION`
- `ASSET_STORAGE_ACCESS_KEY_ID`
- `ASSET_STORAGE_SECRET_ACCESS_KEY`
- optional `ASSET_STORAGE_ENDPOINT`

Do not use local asset storage for split web/worker production services. Their filesystems are independent and may be ephemeral.

Provide authentication configuration:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL` set to the final public HTTPS web origin.

Provide generation credentials:

- `OPENAI_API_KEY`
- `RUNWAY_API_SECRET`

## Secrets

All production credentials in `render.yaml` use `sync: false`. No credential values belong in Git.

## Deployment order

1. Provision production PostgreSQL.
2. Provision the S3-compatible asset bucket.
3. Create the Render Blueprint from this repository.
4. Fill every `sync: false` value.
5. Set `BETTER_AUTH_URL` to the final web origin.
6. Deploy the web service and verify its pre-deploy migration.
7. Start the worker.
8. Verify `/api/health`.
9. Run a deliberately low-cost production acceptance project end-to-end.
10. Confirm generated media and the final master remain available after service restarts.

## Production acceptance

Repository CI does not prove live infrastructure. Before declaring production accepted, verify:

- database connectivity and migration permissions;
- web-to-database connectivity;
- worker queue connectivity;
- object-store read/write permissions from both services;
- OpenAI credential validity;
- Runway credential validity;
- FFmpeg execution in the worker image;
- signed media playback;
- final-master persistence and download.

Do not mark these checks passed until they are actually performed against production.

## Automated production preflight

After the web and worker environment variables are configured, run:

```bash
npm run production:preflight
```

Run it in the production container/environment with the same credentials used by the services.

The command performs zero-cost infrastructure checks:

- strict production environment validation;
- HTTPS authentication origin;
- OpenAI text/image provider configuration presence;
- Runway video provider configuration presence;
- live PostgreSQL query;
- real S3-compatible write/read/signed-URL/delete round trip;
- FFmpeg executable check;
- Python analysis dependency imports.

It intentionally does not submit paid OpenAI or Runway generation requests. A small controlled media project remains the final live-provider acceptance step.

