# Phase 1 — إدارة العملاء المحتملين (Leads)

## What this adds

The public `/register` form now writes a real lead row before it reports
success. The admin workspace has a new Arabic RTL section, **«العملاء المحتملون»**,
reachable from the admin tab and from `/leads` for explicitly authorized
reception staff.

Phase 1 deliberately stops before bulk messaging, subscriptions/payments and
homework. Student accounts are only created by the explicit
**«تحويل إلى طالب»** action.

## Data model

Drizzle schema: `drizzle/schema.ts` → migration `drizzle/0011_useful_lady_bullseye.sql`.

| Table                       | Purpose                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `academy_leads`             | The lead itself: student/parent data, course, status, assignment, follow-up, sync state, conversion state.                                |
| `academy_lead_activities`   | Immutable audit trail: status changes, notes, contacts, follow-ups, assignment, duplicate attempts, conversion, sheet failures/successes. |
| `academy_lead_sync_jobs`    | Durable Google Sheets outbox, one row per lead, with attempts, backoff and lock state.                                                    |
| `academy_lead_dedupe_locks` | Per phone + course lock row used to serialize the 30-day duplicate check.                                                                 |
| `academy_lead_staff`        | Reception access mapped to an existing `users` account; no second auth system.                                                            |

Legacy rows in `academy_registration_requests` are copied once into leads with
`legacyRegistrationId` set; the old table is retained untouched.

## Registration and duplicate rule

`site.submitRegistration` validates the payload, rate-limits the caller, then
calls `createLeadRegistration()`. One transaction:

1. Locks `sha256(normalized phone | course)` in `academy_lead_dedupe_locks`.
2. Looks for the same normalized phone + same course in the previous 30 days.
3. Either appends a duplicate note/activity to the original lead, or inserts a
   new lead with `status = new`, `source = website` and a server timestamp.
4. Writes the activity row and the durable sync job in the same transaction.

Google Sheets is notified afterwards. A Sheets or email failure never changes
the registration result.

## Egyptian phones

`shared/validation.ts` understands local mobile (`010…`, `011…`, `012…`,
`015…`), international (`+20…`), `0020…`, `20…`, `+20 (0)…`, Arabic-Indic
digits and common formatting characters. It rejects letters, wrong lengths and
foreign numbers, then stores the E.164 form (`+20…`). Landlines (`02…`) are
accepted as well.

## Statuses and follow-up

Exact statuses: `new` (جديد), `needs_follow_up` (يحتاج اتصال / متابعة),
`subscribed` (تم التواصل والاشتراك), `not_interested` (غير راغب في الإكمال).

- Status changes happen inline in the table and are recorded with previous/new
  status, employee id and timestamp.
- `needs_follow_up` opens a date/time field for `NextFollowUpDate`.
- `not_interested` opens the four reasons (price/schedule/location/other).
- The red **«متأخر في الاتصال»** badge is computed server-side: a `new` lead
  older than `LEAD_OVERDUE_HOURS` (24 by default), or an overdue
  `NextFollowUpDate` on a lead that has not been converted/closed.
- Counters and quick filters match the four statuses plus «عملائي أنا» and
  «متأخر في الاتصال».

## Google Sheets setup

Use a Google Cloud service account and share the target spreadsheet with its
email as **Editor**. Set these **server-side** variables on the API host
(MonsterASP):

```text
GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL
GOOGLE_SHEETS_PRIVATE_KEY
GOOGLE_SHEETS_SPREADSHEET_ID
GOOGLE_SHEETS_SHEET_NAME=Leads
GOOGLE_SHEETS_ENABLED=true
```

Alternatively put the whole service-account JSON in
`GOOGLE_SHEETS_CREDENTIALS_JSON`.

Optional tuning:

```text
LEAD_OVERDUE_HOURS=24
LEAD_SYNC_INTERVAL_MS=20000
LEAD_SYNC_MAX_ATTEMPTS=8
LEAD_SYNC_RETRY_BASE_MS=60000
```

The integration is one-way (database → sheet). It appends a new row on the
first sync, stores the returned row number, and updates `A{row}:Y{row}` on every
later change. If the row number is missing or stale, it searches column A for
the stable lead id before appending, so retries do not create duplicate rows.
Failures show **«لم يتم النسخ»** with the stored reason; the admin can retry one
lead or queue all failed rows for reconciliation.

**Status:** code, queue, retry, row-update and reconciliation are tested with a
mocked Google API. Live synchronization is **BLOCKED** until the credentials
above and a real spreadsheet are supplied. The admin UI already reports the
exact missing variable names.

## Roles

| Role                                 | Access                                                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin (`users.role = admin`)         | Full leads access, assignments, conversions, employee roster, sync retries.                                                                  |
| Reception (`academy_lead_staff` row) | View/search/filter, edit unassigned or own leads, notes/contact; convert only when `canConvert = true`; cannot reassign to another employee. |
| Instructor                           | Denied unless explicitly added to `academy_lead_staff`.                                                                                      |
| Student/parent                       | No access.                                                                                                                                   |

All checks run in the tRPC middleware (`leadAccessProcedure`) and again before
each mutation. IDOR is closed by reloading the lead and comparing its
`assignedEmployeeId` with the caller.

## Tests

```text
pnpm check                          # TypeScript
pnpm test                           # 429 Vitest tests (Phase 1 + existing suite)
npx tsx scripts/phase1-e2e.ts       # real browser E2E against a running dev server
pnpm build                          # MonsterASP bundle
pnpm build:vercel                   # Vercel frontend bundle
pnpm package:monster                # release/monsterasp/monsterasp-site.zip
```

`scripts/phase1-e2e.ts` creates isolated test records, exercises registration,
duplicate prevention, search, status/follow-up, details, conversion, Google
Sheets warning, staff access, mobile layout and RTL, then deletes every record.

## Deployment

1. Apply `drizzle/0011_useful_lady_bullseye.sql` with the existing Drizzle
   migration command (`pnpm db:push`) against the DB the API uses.
2. Upload `release/monsterasp/monsterasp-site.zip` to MonsterASP → Files,
   unzip into `/wwwroot`, overwrite, restart the application.
3. Add the Google variables above to MonsterASP environment variables.
4. Deploy the Vercel frontend with the existing `VITE_API_URL` production
   variable pointing at `https://ideveloper-academy.runasp.net`.
5. Smoke test `/leads`, `/register`, a status change and a conversion.

The repository has no MonsterASP upload credentials, so step 2 must be done in
the MonsterASP panel (or with the account's FTP/SFTP credentials).
