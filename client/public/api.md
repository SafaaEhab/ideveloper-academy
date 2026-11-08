# iDeveloper Academy public API

The public website is served from `https://ideveloper-academy.vercel.app` and
the API + database are hosted on MonsterASP. The tRPC endpoint is:

`https://ideveloper-academy.runasp.net/api/trpc`

There is currently **no published OpenAPI document**. The API catalog therefore
advertises this documentation and a liveness endpoint, not a fabricated
`service-desc` OpenAPI resource.

## MCP server

A public, read-only MCP server is available at:

- Endpoint: `POST https://ideveloper-academy.runasp.net/mcp`
- Server card: `https://ideveloper-academy.runasp.net/.well-known/mcp/server-card.json`

It exposes three tools: `list_courses`, `get_achievements`, and
`get_announcement`. No authentication is required and no private data is
reachable.

## tRPC conventions

- Queries use `GET /api/trpc/<procedure>`.
- Mutations use `POST /api/trpc/<procedure>` with JSON input.
- The client uses the superjson transformer. Responses are normally shaped as
  `{ "result": { "data": { "json": ... } } }` and may include `meta`.

## Public procedures

| Procedure | Type | Purpose |
|---|---|---|
| `site.achievements` | Query | Published achievement cards |
| `site.announcement` | Query | The currently enabled public announcement |
| `site.courses` | Query | Course catalogue with persisted availability status |
| `site.submitRegistration` | Mutation | Persist a public registration request |
| `site.joinWaitingList` | Mutation | Persist a waiting-list request for a course |
| `site.requestAccess` | Mutation | Request admin workspace access (rate-limited) |

## Student-session procedures

These require the signed student session cookie obtained from
`portal.byCode`:

| Procedure | Type | Purpose |
|---|---|---|
| `portal.byCode` | Query | Exchange an access code for a student session |
| `portal.session` | Query | Restore the current student session |
| `portal.learning` | Query | Persisted lesson completion and quiz attempts |
| `portal.performance` | Query | Server-calculated performance summary |
| `portal.setLessonComplete` | Mutation | Mark one enrolled lesson complete/incomplete |
| `portal.submitQuiz` | Mutation | Submit quiz answers; the server calculates the score |
| `portal.assignments` | Query | Assignments and the student's submission |
| `portal.submitAssignment` | Mutation | Submit text, code and/or a permitted file |
| `portal.logout` | Mutation | Clear the student session |

## Protected administration

Admin and instructor procedures are role-gated and are not documented as public
agent capabilities. They must not be called without an authorized session.

## Health

`GET /api/health` returns:

```json
{ "status": "ok", "service": "ideveloper-academy" }
```
