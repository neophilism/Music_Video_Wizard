# Production readiness monitoring

The GitHub Actions workflow `.github/workflows/production-readiness-monitor.yml` polls the deployed `/api/ready` endpoint every 15 minutes and can also be started manually.

## Activation

1. Confirm the approved Render workspace and complete the production web + worker deployment. Do not infer a workspace from the connector's default.
2. In GitHub repository Settings > Secrets and variables > Actions > Variables, set `MVW_PRODUCTION_URL` to the public HTTPS **origin only**, such as `https://music-video-wizard.example.com` (no slash path, query or fragment).
3. Run the workflow manually and verify its result. Scheduled runs continue every 15 minutes.
4. Configure GitHub Actions failure notifications or external incident alerting; this workflow does not itself guarantee paging or automatic incident resolution.

The monitor intentionally fails with an explicit configuration error if the URL is missing. It checks HTTP 200 and the JSON service/configuration/database readiness contract, not merely whether a server returns a page.

## Limits

This is a web/database availability signal only; it does not verify the background worker, queue consumption, object-store access, or paid generation providers. For those use `npm run ops:status`, `npm run ops:asset-integrity`, `npm run production:preflight`, and a controlled full music-video acceptance run. Never put credentials or signed media URLs in the repository variable.

Engine Room integration should consume a trusted service status source or a dedicated integration rather than treating this public readiness endpoint as proof of the entire pipeline.
