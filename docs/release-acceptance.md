# Release acceptance gate

PR 43 adds a single integrated smoke test for the finished Music Video Wizard release architecture.

Run:

```bash
npm run test:acceptance
```

The command is part of CI and runs after database migrations and the queue smoke test.

## What it protects

The release gate intentionally validates cross-cutting invariants that are easy to break while individual subsystem tests still pass:

- the complete wizard stage order from Project Setup through Finish & Export;
- every release stage has an executable editor rather than a placeholder;
- wizard ordinals remain strictly increasing;
- every production generation/render handler is registered;
- duplicate handler registration remains rejected;
- an installation with all optional external providers disabled remains a valid configuration;
- a freshly migrated database can initialize the complete wizard state;
- the wizard can resolve both the first and final release editors from persisted state.

## What it does not fake

The acceptance smoke test does not call paid external generation APIs and does not claim to validate provider credentials, provider availability, or production object-storage permissions.

Provider adapters remain covered by focused contract tests. Live-provider and infrastructure validation belong to deployment/production acceptance, where real credentials and network access are available.

## Release rule

A release candidate is not considered repository-green unless:

1. Prisma schema validation and migrations pass;
2. typecheck and lint pass;
3. the full unit/smoke suite passes;
4. the durable queue smoke test passes;
5. `npm run test:acceptance` passes;
6. the production Next.js build passes.
