# Production operations

PR 49 adds a non-public operator command for inspecting durable generation/render health.

Run:

```bash
npm run ops:status
```

Machine-readable output:

```bash
npm run ops:status -- --json
```

Monitoring-friendly stale-work check:

```bash
npm run ops:status -- --fail-on-stale
```

The command exits with code 2 when stale queued/running jobs are detected.

## Reported signals

- live database latency;
- total GenerationJob counts by status;
- active queued/running jobs;
- progress, provider/model, attempt count, age, and time since last update;
- stale active jobs;
- failures completed during the last 24 hours;
- truncated failure messages.

The stale threshold is the larger of five minutes or six configured worker heartbeat intervals.

## Security boundary

This is deliberately a CLI/operator capability, not a public HTTP endpoint.

Generation job IDs, provider names, model names, progress details, and failure text can reveal internal operational information. Keep the command inside the production operator environment and do not expose its raw output publicly.

The command prints no environment variables, credentials, request snapshots, asset URLs, or provider secrets.
