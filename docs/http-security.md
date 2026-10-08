# HTTP security headers

PR 47 adds a global browser-facing security-header baseline through Next.js.

## Headers

Every application response receives:

- `Content-Security-Policy`
  - `base-uri 'self'`
  - `form-action 'self'`
  - `frame-ancestors 'none'`
  - `object-src 'none'`
- `Cross-Origin-Opener-Policy: same-origin`
- `Origin-Agent-Cluster: ?1`
- `Permissions-Policy` denying camera, microphone, geolocation, payment, and USB by default
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`

Production builds also receive HSTS with a two-year max age, subdomain coverage, and preload eligibility.

## CSP boundary

The CSP is deliberately conservative at this stage.

It blocks framing, plugins, hostile base-URL rewriting, and cross-origin form submission, but it does not set a restrictive `default-src`, `script-src`, `img-src`, or `media-src`.

A stricter nonce/hash-based policy is desirable later, but it should be introduced only with explicit coverage for:

- Next.js hydration/runtime scripts;
- Better Auth flows;
- signed S3-compatible image/video URLs;
- local development;
- generated media previews.

The release must not claim a strict CSP while relying on broad `unsafe-inline` or breaking generated-media playback.

## Application permissions

Camera and microphone are disabled globally because the current product uploads an existing finished master and generated media; it does not need browser recording access.
