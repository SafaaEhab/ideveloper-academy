# High-severity issues — status and verification

Source report: `ideveloper_high_issues.xlsx` (tested 29 Oct 2026).
Re-verified against the current code and live deployment on **4 Nov 2026**.

| ID | Issue | Status | Fix / evidence |
| --- | --- | --- | --- |
| H-01 | Achievement image URL not validated | **Fixed** | `validateImageSource` rejects `not-a-url`, `javascript:` and `http://`; accepts only HTTPS or `/images/` + `/api/uploads/achievements/`. Live API returns `400 BAD_REQUEST`; `SafeImage` also shows a placeholder on load errors. |
| H-02 | Phone accepts letters | **Fixed** | Shared `validatePhone` requires `+?` then 8–15 digits. Applied to students, instructors, registration, waiting list, parent and sibling phones. Live admin API returns `400 BAD_REQUEST` for `abcdefgh`. |
| H-03 | Registration only sent via WhatsApp | **Fixed** | `/register` calls `site.submitRegistration`, waits for the DB insert, then shows “تم استلام الطلب — Request received”. WhatsApp is an optional follow-up. Live test created a real row in `academy_registration_requests` (then cleaned up). |
| H-04 | Progress and quiz scores only in browser | **Fixed** | `portal.setLessonComplete` and `portal.submitQuiz` write to `student_progress` and `academy_quiz_attempts`; `portal.learning` hydrates them after reload. Live student test: completion 1, quiz 1, then cleaned. |
| H-05 | No assignment submission/grading | **Fixed** | Assignments + submissions + grading UI/API exist (`portal.assignments`, `portal.submitAssignment`, `instructor.gradeSubmission`), with file upload validation. Covered by `analytics.router.test.ts` and `instructor.test.ts`. |
| H-06 | Public courses always “Book your spot” | **Fixed** | One `academy_course_offerings` status is read by both admin and public site. `live` shows booking, `coming_soon`/`waiting_list` show “Join waiting list”. Live comparison: public and admin statuses match exactly. |
| H-07 | Attendance counted before joining | **Fixed** | `effectiveAttendanceStart` uses `max(filter start, student.createdAt)`. Covered by `analytics.joining.test.ts`; the performance summary also marks “since joining”. |
| H-08 | Achievement upload disabled (Cloudinary key missing) | **Fixed** | Server now falls back to local storage in `App_Data/uploads/achievements`, served at `/api/uploads/achievements/:file`, when Cloudinary keys are absent. The admin upload button is enabled. Live test uploaded a PNG, fetched it (200 image/png), created an achievement with it, deleted it, and the file then returned 404. |

## Tests run

```powershell
pnpm check            # TypeScript
pnpm test             # 35 files / 413 tests — all passed
```

Live checks against `https://ideveloper-academy.runasp.net`:

- H-01 invalid image → `400 BAD_REQUEST`
- H-02 letters phone → `400 BAD_REQUEST`
- H-03 registration → row persisted in MySQL, then removed
- H-04 student lesson + quiz → persisted, then removed
- H-06 public vs admin course statuses → exact match
- H-08 upload → served 200, create + delete → file 404
- Admin access → signed admin session; student access → access code + signed student session; instructor access → real login + `instructor.me`
- No test rows were left behind (students, registrations, progress, quizzes, courses and instructor accounts all cleaned)

Lighthouse after the fixes:

- Desktop: **100** performance, 100 accessibility, 100 best practices, 100 SEO
- Mobile: **99–100** performance, 100 accessibility, 100 best practices, 100 SEO

## Notes

- Local uploads live under `App_Data/uploads/achievements` (preserved across
  MonsterASP deployments). Set `UPLOAD_DIR` to override the path.
- If Cloudinary keys are added later, uploads automatically switch back to
  Cloudinary; existing local images keep working.
- The H-08 fix deliberately does not require a Cloudinary account, so the
  admin can upload photos today.
