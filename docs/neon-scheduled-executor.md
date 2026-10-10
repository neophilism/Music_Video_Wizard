# Neon-scheduled free executor

PR 56 removes the requirement for a paid Render background-worker service.

## Topology

- Existing/free Render web service hosts the Next.js product.
- A second free Docker web service, `music-video-wizard-executor`, exposes only the authenticated bounded queue-drain endpoint for scheduled execution.
- Neon Lakebase Postgres remains the durable database and pg-boss queue store.
- Neon Object Storage stores uploaded/generated media.
- A Neon Function Trigger wakes the executor on a schedule.
- The executor runs the already-tested Docker runtime, so Python analysis and FFmpeg rendering continue to work unchanged.

The executor is public at the network layer because Render free services are web services, but the drain route rejects requests before touching the queue unless `X-Job-Drain-Secret` matches `JOB_DRAIN_SECRET`.

## Bounded queue draining

`POST /api/internal/jobs/drain` fetches a bounded batch from the existing pg-boss queue instead of starting an always-on polling worker.

Each fetched job:

1. preserves the same durable GenerationJob state machine;
2. renews its pg-boss heartbeat while processing;
3. uses the same registered generation/render handlers as the original worker;
4. completes the pg-boss attempt on success or permanent application-level failure;
5. fails the pg-boss attempt on transient errors so the existing retry/backoff policy applies.

This keeps queue semantics and idempotency intact while allowing scheduled/on-demand execution.

## Cost behavior

The old Render background worker is replaced by a free Render web service plus Neon scheduling. There is no continuously billed worker process.

The executor can scale/sleep according to the free web-service behavior. The scheduled Neon Function provides the wake-up path.

## Media runtime boundary

The executor remains Docker-based because two release stages require native tooling:

- local music analysis uses Python/librosa and FFmpeg;
- final master rendering uses FFmpeg.

Moving those two jobs fully into Neon Functions would require packaging native ARM64 executables and replacing the Python analysis environment. This topology avoids that risky rewrite while still removing the paid worker service.

## Required environment

The executor and web service share:

- `DATABASE_URL`;
- Neon Object Storage S3-compatible configuration;
- provider configuration/secrets required by enabled generators.

The executor additionally requires:

- `JOB_DRAIN_SECRET` — at least 32 characters;
- `JOB_DRAIN_BATCH_SIZE` — defaults to 2.

The Neon scheduling Function holds the same drain secret and the executor URL.
