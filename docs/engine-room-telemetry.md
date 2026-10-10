# Signed Engine Room worker probe telemetry

Music Video Wizard can publish one **point-in-time worker-presence probe** every 60 seconds from the background worker into Engine Room's existing HMAC-authenticated `POST /api/telemetry` API. This does not require exposing private queue jobs or signing keys to a browser.

## Server-side setup (optional, opt-in)

After the Engine Room Music Video Wizard project exists and its UUID is verified, issue a scoped telemetry credential on the **Engine Room** host through `ENGINE_ROOM_TELEMETRY_KEYS`. Use a key object with these fields:

```json
{
  "id": "mvw-worker-prod",
  "secret": "<generate-a-unique-32-plus-byte-secret>",
  "projectId": "<verified-music-video-wizard-project-uuid>",
  "environment": "production",
  "source": "music-video-wizard-worker",
  "adapter": "engine-room-v1",
  "capabilities": ["metric"],
  "evidenceTransitions": []
}
```

On the approved Music Video Wizard **worker** service, set the corresponding secret environment variables:

```text
ENGINE_ROOM_TELEMETRY_URL=https://<approved-engine-room-host>/api/telemetry
ENGINE_ROOM_TELEMETRY_KEY_ID=mvw-worker-prod
ENGINE_ROOM_TELEMETRY_SECRET=<same-unique-secret>
```

Only the worker needs sender credentials; do not commit them, add them to a public GitHub variable, or print them. All three sender settings absent disables telemetry. Partial or insecure settings fail startup explicitly. The endpoint must use HTTPS, have exactly the `/api/telemetry` path, and contain no embedded credentials or query parameters.

## Observation semantics

Every 60 seconds the worker checks whether any worker process has written a recent heartbeat to shared PostgreSQL (90-second freshness). It sends an HMAC-SHA256 signed canonical `engine-room-v1` envelope containing one `availability-percent` sample: **100 when the instantaneous heartbeat probe succeeds, 0 otherwise**. This is a binary process observation, **not** rolling uptime, error-free generation, GPU/CPU utilization, storage validity, AI API availability or proof that finished videos can render. Engine Room's own completeness checks should continue to show other dimensions as unknown until evidence exists.

The request includes a unique idempotency delivery ID, Unix millisecond timestamp, source key ID, and signature over `timestamp + "." + exact body bytes`, matching Engine Room's five-minute clock-skew rule. It limits request duration to 10 seconds, rejects redirects, and does not expose tokens in logs. Telemetry failures are noncritical to the video-generation process; they should appear as stale feed freshness in Engine Room and require operational alerting.

## Acceptance

1. Confirm approved Render and Neon projects, execute PR #55's additive heartbeat migration and start the generation worker.
2. Confirm `npm run ops:health -- --json` reports one or more recent worker heartbeats.
3. Create the scoped Engine Room project credential and configure the sender securely.
4. Observe a signed 202 Accepted delivery (or 200 idempotent replay) and an Engine Room feed with a recent UTC timestamp.
5. Stop the worker in staging and verify the observation becomes **stale/unknown** after freshness expires; it must not remain falsely green.
6. Independently run a low-cost full video-generation-to-export acceptance test before declaring the application production-ready.

**Not yet active merely by merging code:** the sender stays disabled without the real per-project credential and approved deployment.
