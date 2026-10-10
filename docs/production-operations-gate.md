# Production operations gate — not a live-provider certification

Run this **inside the approved production container with production secrets** after applying all migrations, starting the web and worker services, and configuring S3-compatible storage:

```bash
npm run ops:production-gate -- --json
```

The command executes three pre-existing, independently testable checks sequentially:

1. `production:preflight` — validates production environment and required provider *configuration presence*, runs an actual PostgreSQL query, exercises the S3 object-store write/read/signed-URL/delete path, and runs FFmpeg/Python dependency probes.
2. `ops:health -- --json --fail-unhealthy` — requires a recent durable worker heartbeat and no stale RUNNING jobs.
3. `ops:asset-integrity -- --json` — confirms READY media objects still exist in shared storage. A full checksum check remains a separate `ops:asset-integrity -- --deep` run.

Every check must pass. Failure stops subsequent checks and exits nonzero; the structured report contains only check names, pass/fail and explicit unverified stages rather than database exception strings, storage keys or secrets. Each check has a maximum runtime of ten minutes.

A green result proves **only** these operational preconditions. It does not show that paid OpenAI/Runway generation works, that the entire wizard creates a video, that a master survives a restart, that a backup was restored, or that a production release is authorized.

Complete a low-cost actual user journey (account → audio upload → storyboard → generation → automatic first cut → refinement → FFmpeg master → signed playback/download), then verify persistence after restarting the web and worker. Record separately which checks passed and capture an Engine Room release evidence link. Do not set production status to `live` solely because the operations gate passes.

Before touching Render, confirm the approved **Music Video Wizard** workspace; the workspace named **Phillip's workspace** is explicitly excluded.
