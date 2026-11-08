# auth.md — iDeveloper Academy authentication

This document describes the authentication that actually exists for the public
site at `https://ideveloper-academy.vercel.app` and the API at
`https://ideveloper-academy.runasp.net`. It does **not** advertise OAuth 2.0 or
OpenID Connect discovery because the application is not an OAuth/OIDC
authorization server.

## Authentication model

iDeveloper Academy uses first-party session cookies:

- **Students** enter an academy-issued access code at `/student`. The server
  exchanges a valid code for a signed, HttpOnly student session cookie.
- **Administrators and instructors** sign in with email and password at
  `/login`. Passwords are hashed server-side and a signed session cookie is
  issued after a successful login.
- Roles are enforced on the server: `admin`, `instructor`, and authenticated
  student sessions use separate authorization middleware.

## Public resources

The following resources are public and require no credentials:

- `GET /api/trpc/site.courses`
- `GET /api/trpc/site.achievements`
- `GET /api/trpc/site.announcement`
- `POST /api/trpc/site.submitRegistration`
- `POST /api/trpc/site.joinWaitingList`
- `GET /auth.md`
- `GET /api.md`
- `GET /.well-known/api-catalog`
- `GET /.well-known/ai-catalog.json`
- `GET /.well-known/agent-skills/index.json`
- `GET /.well-known/mcp/server-card.json`
- `POST /mcp` (read-only MCP tools: courses, achievements, announcement)

## Protected resources

Student, instructor and administrator data is never public. Requests to
`/admin`, `/instructor`, `/student`, protected tRPC procedures, and assignment
file downloads require the appropriate session and return an authorization
error without one.

## Agent registration

There is **no** public agent-registration, client-registration, token, JWKS or
dynamic client-registration endpoint. Agents should use only the public
resources above. Do not attempt to create accounts or obtain credentials on a
user's behalf.

## OAuth discovery

The following endpoints are intentionally not published because there is no
compatible authorization server:

- `/.well-known/openid-configuration`
- `/.well-known/oauth-authorization-server`
- `/.well-known/oauth-protected-resource`

The public MCP server at `/mcp` needs no token. It cannot read student,
instructor, administrator or assignment data.

## Contact

Academy phone: `01062302368`  
Website: `https://ideveloper-academy.vercel.app`
