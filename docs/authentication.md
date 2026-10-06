# Authentication and account boundary

PR 3 uses Better Auth with the Prisma adapter for persistent email/password authentication and server-side sessions.

## Security properties

- Password material is handled by Better Auth and is never stored on the User row.
- Credential hashes live in the Account record managed by Better Auth.
- Passwords must be 12-128 characters.
- Sessions are database-backed and validated server-side before protected content is rendered.
- Authentication routes use Better Auth's built-in request/session protections.
- Rate limiting is enabled with database-backed counters so limits work across multiple application instances.
- Sign-in is capped more aggressively than ordinary auth traffic.
- The Better Auth secret is mandatory and must contain at least 32 characters.
- The public application origin is explicit through BETTER_AUTH_URL rather than inferred from arbitrary request headers.

## User schema mapping

The product already uses `displayName`; Better Auth's logical `name` field is mapped to that column. Application/session code uses Better Auth's typed `user.name` property while Prisma retains the product-oriented column name.

## Workspace provisioning

A signed-in user is guaranteed a workspace before entering the authenticated application.

Provisioning uses a serializable transaction with retry handling so concurrent first requests cannot silently corrupt membership state.

The service is idempotent: if the user already belongs to a workspace, the existing workspace is returned.

## Route protection

Protected pages validate the database-backed session on the server with `auth.api.getSession`. No authorization decision relies only on the presence of a cookie.

## Email verification and password recovery

PR 3 intentionally does not expose fake email verification or password-reset delivery. Those flows require a real transactional email provider. When email infrastructure is added, Better Auth already provides the verification/reset primitives and the schema includes the Verification table needed by those flows.
