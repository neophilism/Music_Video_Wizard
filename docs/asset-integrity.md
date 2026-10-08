# Asset integrity and recovery checks

PR 52 adds an operator-side integrity audit for the database-to-object-storage boundary.

## Fast existence audit

Run:

```bash
npm run ops:asset-integrity
```

The command enumerates every READY AssetVersion in PostgreSQL and verifies its storage key exists in the configured AssetStorage backend.

It exits with code 2 if any READY asset is missing.

## Deep audit

Run:

```bash
npm run ops:asset-integrity -- --deep
```

Deep mode additionally:

- downloads each READY asset;
- compares the actual file size to `AssetVersion.byteSize` when recorded;
- recomputes SHA-256;
- compares the result to `AssetVersion.checksumSha256` when recorded;
- removes each temporary local file after verification.

Use deep mode for release drills, backup validation, incident recovery, or periodic integrity checks. It can transfer substantial media volume, so do not run it continuously on large libraries.

## Machine-readable output

```bash
npm run ops:asset-integrity -- --json
npm run ops:asset-integrity -- --deep --json
```

## Recovery boundary

This command detects missing or corrupted durable media; it does not silently repair it.

Recovery should restore the exact object at the recorded storage key from the storage provider's backup/versioning system, then rerun the audit. If an object cannot be restored, preserve the database provenance and explicitly regenerate/render a later AssetVersion rather than overwriting historical identity.
