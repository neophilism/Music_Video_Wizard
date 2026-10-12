# Music Video Wizard

**Complete original development plan:** [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md).

Music Video Wizard is a production web application for taking a creator from finished music through creative direction, storyboard, generated shots, a fully compiled first cut, iterative refinement, and final render.

## Product rule

The application is built around a **creative specification**, not a pile of generated assets. Approved creative decisions become structured, versioned data that downstream generation and timeline compilation consume.

The audio master is immutable: this application does not edit music.

## Foundation

PR 1 establishes the production application foundation:

- Next.js + React + strict TypeScript
- PostgreSQL boundary through Prisma
- provider-neutral media storage contract
- runtime environment validation
- health endpoint
- Vitest
- CI for type checking, linting, tests, and production build
- local PostgreSQL through Docker Compose

Product-domain models deliberately begin in PR 2 so the domain architecture receives its own review rather than being accidentally frozen inside setup work.

## Local development

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL: `docker compose up -d`.
3. Install dependencies: `npm install`.
4. Generate the Prisma client: `npm run db:generate`.
5. Start the app: `npm run dev`.

## Quality gates

Run:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Every pull request is expected to pass the same commands in CI.

## Architecture rules

- Product code must not bind directly to a specific image/video generation provider.
- Product code must not bind directly to a specific object-storage SDK.
- Persisted creative decisions and derived assets must retain provenance and version identity.
- Downstream invalidation/recompilation must be dependency-aware.
- The automatic first cut is a core product capability, not a manual editing shortcut.
- Temporary mocks must never silently masquerade as completed production capability.

## End-to-End Everywhere progress

The canonical [security/e2eesa-status.json](security/e2eesa-status.json) records standard implementation, complete testing and independent expert review separately. Engine Room reads it automatically from GitHub. All initial stages are pending; existing profile locks and approved decisions remain authoritative. Read [adoption and independent-account instructions](docs/E2EESA_ADOPTION.md), and run `python3 scripts/validate_e2eesa_status.py`. Record validation does not establish product security or certification.
