# Neon connection policy for the first production rollout

Music Video Wizard already uses Prisma, a PostgreSQL-backed pg-boss queue, and an additive Prisma migration sequence. Current `render.yaml` gives the **same** `DATABASE_URL` to the web app, background worker, and the web service's `npm run db:deploy` pre-deploy migration.

The worker enables pg-boss `useListenNotify: true`, which requires a **direct PostgreSQL session** rather than a transaction-pooled (PgBouncer) connection. Prisma production schema migrations should likewise use a direct connection. This initial production topology therefore requires the **non-`-pooler` Neon PostgreSQL connection string** as `DATABASE_URL` on both web and worker.

The production environment parser now rejects obvious Neon `-pooler` URLs before they can result in a superficially green startup. This guard is intentionally narrow: other connection proxies must also be checked for transaction-pooling or session-feature limitations before use.

## Deployment checklist

1. Locate the existing Neon project **Music Video Wizard**, project ID `fragrant-voice-00978570`, on its `production` branch.
2. Retrieve its **direct** PostgreSQL connection string from Neon. Do not put the value in Git, PR comments, Engine Room, or this document.
3. Configure `DATABASE_URL` to that direct endpoint on the approved Music Video Wizard Render **web and worker** services.
4. Ensure the deployment's `npm run db:deploy` pre-deploy step runs successfully, with every canonical Prisma migration applied in order. The database initially has no application tables; never interpret an empty database as a migrated production database.
5. Verify `/api/ready` and then `npm run ops:health -- --json`, `npm run production:preflight`, and an actual end-to-end video generation.
6. Revisit split connectivity if direct-connection count becomes a measurable constraint: introduce a separate direct migration/queue URL and keep an independently validated pooled application URL, rather than silently sharing a pooler URL with pg-boss.

**Workspace restriction:** Do not deploy or alter the explicitly prohibited Render workspace named **Phillip's workspace**. The connected Render environment must expose and select the approved workspace before any deployment.

The production database was inspected read-only before this change. No SQL migrations or production credentials were applied as part of this PR.
