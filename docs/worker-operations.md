# Worker heartbeat and queue observation

The production web and background-worker processes are separate. A green public `/api/ready` endpoint only proves web configuration and a live database query: **it does not prove the generation worker is running**.

PR #55 adds a small durable `WorkerHeartbeat` table. Each actual background-worker process creates a random UUID row on startup, refreshes it every 30 seconds, and deletes its own row when stopping gracefully. A seven-day cleanup discards abandoned rows. Heartbeats contain no user IDs, provider credentials, hostnames, job IDs or project metadata.

After running `npm run db:deploy`, query:

```bash
npm run ops:health
npm run ops:health -- --json
npm run ops:health -- --json --fail-unhealthy
```

The output aggregates active worker processes (observed within 90 seconds), job counts, stale RUNNING jobs, QUEUED jobs older than 15 minutes, failure count in 24 hours and measured database ping latency. It never prints failure messages or media identifiers.

The explicit states mean:

- `heartbeat-active` — at least one recent worker pulse and no stale RUNNING jobs; not a guarantee that provider credentials, storage or paid generation work.
- `worker-unverified` — no recent worker pulse; not proof of complete outage.
- `degraded` — at least one stale RUNNING job even if a worker has a heartbeat.

`--fail-unhealthy` exits with status 2 for degraded or unverified worker observations and 1 for infrastructure/query errors. Default mode is observational and exits 0 after a successful query even if workers are absent.

For Engine Room, ingest this observation through a **scoped, authenticated telemetry bridge**, never expose this detailed operational output as an unauthenticated public endpoint. An Engine Room project row or healthy web readiness probe must not substitute for recent worker evidence. GitHub PR completion remains separate from live production acceptance.

The deployment migration must finish before starting the new worker image. On rollback, retain this additive table until all new workers are stopped.
