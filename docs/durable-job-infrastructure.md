# Durable job infrastructure

PR 5 establishes the asynchronous execution layer used by later image generation, video generation, analysis, and rendering milestones.

## Queue backend

The application uses **pg-boss 12.36.0** on the existing PostgreSQL database rather than adding Redis solely for background work.

The queue is stored in a dedicated PostgreSQL schema (default: `pgboss`). The application tables remain managed by Prisma.

## Atomic enqueue

`enqueueGenerationJob()` creates the application `GenerationJob`, its initial audit event, its input-node references, and the pg-boss queue row inside the **same Prisma transaction**.

pg-boss's `fromPrisma()` adapter is used for the queue insert. This prevents either half of the classic failure mode:

- database job exists but was never queued
- queue job exists without the corresponding application record

The application UUID is also the pg-boss job UUID.

## Reliability

The generation queue is configured with:

- automatic retries
- exponential backoff
- bounded retry delay
- execution expiration
- worker heartbeats
- LISTEN/NOTIFY for low dispatch latency with polling as the safety net
- per-process concurrency
- global per-workspace concurrency
- queue retention and cleanup

Long-running provider handlers receive the pg-boss `AbortSignal` so cancellation, expiration, or a lost heartbeat can stop provider work when the provider adapter supports aborts.

## Persistent job state

`GenerationJob` now records:

- attempt count / maximum attempts
- 0-100 progress
- current progress message
- error message
- start/completion/cancellation timestamps

`GenerationJobEvent` preserves an ordered event history:

- QUEUED
- STARTED
- PROGRESS
- RETRY_SCHEDULED
- SUCCEEDED
- FAILED
- CANCELLED

This is application-owned history and is not dependent on pg-boss retention. Queue retention can therefore be tuned independently without erasing the product's audit trail.

## Provider handler boundary

Workers dispatch through `GenerationHandlerRegistry` using:

`GenerationKind + providerKey`

No provider-specific SDK is embedded in the queue layer. Future provider PRs register real handlers.

No placeholder generation handler is registered in PR 5. Nothing can accidentally return a fake image/video result.

## User-facing job API

Authenticated users can:

- GET `/api/jobs/:jobId` for job state and event history
- POST `/api/jobs/:jobId/cancel` to cancel a queued/running job

Both endpoints enforce workspace membership.

## Worker process

Run:

```bash
npm run worker
```

The worker is a separate process from Next.js. It drains gracefully on SIGTERM/SIGINT.

## Validation

CI launches PostgreSQL, applies the real Prisma migrations, and runs a pg-boss smoke test that creates a real queue, sends a durable job, receives it through a worker, and cleans it up.
