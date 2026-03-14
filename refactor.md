# Rewrite Recommendations

## Goals
Simplify the stack to reduce attack surface and make security easier to audit.

## Drop HEIC support
Accept only JPG/PNG. Removes `libheif` and all HEIC conversion code.

## Replace `sharp` with `jimp`
`jimp` is pure JavaScript — no native binaries for image processing. Adequate for
generating 400px thumbnails from JPG/PNG. Slower than `sharp` but acceptable for
this use case.

## Simplify authentication
Replace Next.js middleware (which requires keeping a `matcher` config and a
`PROTECTED_PATHS` list in sync) with per-route auth checks. Each protected route
handler calls a `requireAuth()` function directly. No magic, no config to
misconfigure.

## Lock down Docker
Bind to localhost only:
```yaml
ports:
  - "127.0.0.1:3000:3000"
```
This prevents Docker from bypassing UFW and exposing the port publicly.

## Enable Apache request logging for port 3000 traffic
Since Apache proxies all traffic, its access log is the complete audit trail.
Ensure `X-Forwarded-For` is logged so real client IPs are recorded, not localhost.

## Consider replacing Next.js
Next.js is a large framework with a CVE history and a complex internal request
pipeline. For a site this simple, a plain Express or Fastify backend serving a
static frontend would have a smaller and more auditable attack surface. That said,
this is the lowest-priority recommendation — the items above address the known
issues without a full framework replacement.
