
# Project TODO

- [x] Establish exact brand name: I Developer Academy
- [x] Build branded bilingual public landing page with uploaded logo and extracted color palette
- [x] Add persisted dark/light theme toggle
- [x] Add Arabic/English switcher with full RTL/LTR layout support
- [x] Build protected role-based admin dashboard with sidebar navigation
- [x] Add student CRUD with automatic unique access-code generation
- [x] Add group CRUD and assign specific days/times schedules
- [x] Add four exact courses: Scratch, Robotics, Web, and Python
- [x] Assign one or more courses and a group to each student
- [x] Build public student portal for access-code login
- [x] Preload Python curriculum with lessons, topics, and exercises
- [x] Show Coming Soon placeholders for Scratch, Robotics, and Web
- [x] Add backend schema, queries, tRPC procedures, and admin authorization
- [x] Add Vitest coverage for access-code generation and core procedures
- [x] Verify responsive UI, bilingual flows, theme persistence, and key routes
- [x] Save final checkpoint and deliver project version

- [x] Add student edit UI and wire it to admin.updateStudent; show assigned group and courses
- [x] Add group edit UI and wire it to admin.updateGroup for schedule management
- [x] Add explicit frontend role handling for /admin
- [x] Expand Vitest coverage for portal lookup and admin management procedures
- [x] Verify mobile layout, Arabic RTL, English LTR, persisted theme, and /admin route behavior
- [x] Create final project checkpoint after the validation pass

- [x] Add Vitest tests for successful portal lookup and inactive/not-found codes
- [x] Add Vitest coverage for admin create/update/delete student and group procedures
- [x] Verify Arabic RTL and English LTR rendering on key routes
- [x] Verify dark/light theme persistence across reloads

- [x] Add portal tests for not-found and inactive-code outcomes
- [x] Add mocked successful admin create/update/delete procedure tests
- [x] Capture evidence for Arabic RTL and English LTR key routes
- [x] Capture evidence for dark/light persistence across reloads
- [x] Create final checkpoint only after all evidence is collected

- [x] Verify theme preference remains after an actual page reload using the persisted localStorage path
- [x] Create and record the final project checkpoint after the reload verification

- [x] Fix duplicate React keys in the admin sidebar navigation
- [x] Verify /admin has no duplicate-key console warnings
- [x] Save a checkpoint for the warning fix

- [x] Add an add-student action directly inside each visible group card
- [x] Preselect and lock the selected group in the inline student form
- [x] Make student phone required in create and edit UI forms
- [x] Make student phone required in create and update tRPC validation
- [x] Add or update tests for group-scoped student creation and required phone
- [x] Verify the admin flow and save a checkpoint

- [x] Center the dark circular logo mark fully inside the logo container
- [x] Update all logo usages to the centered asset
- [x] Verify logo alignment on landing page and student portal
- [x] Save a checkpoint for the logo alignment fix

- [x] Extract and map the uploaded Python curriculum into 3 phases and 12 sessions
- [x] Add bilingual Python lesson explanations, examples, topics, and challenges
- [x] Add a polished curriculum explorer with phase navigation and visual progress
- [x] Add the uploaded Python roadmap image to the student portal
- [x] Verify the Python curriculum portal in Arabic RTL and run TypeScript/tests
- [x] Save a checkpoint for the Python curriculum update

- [x] Make each Python lesson open its full explanation, example, and challenge on click
- [x] Make lesson action buttons visibly functional with feedback
- [x] Remove the uploaded roadmap image from the student portal
- [x] Build a custom in-site Python roadmap matching the academy visual language
- [x] Verify lesson interactions and roadmap layout in Arabic and English
- [x] Save a checkpoint for the curriculum interaction fix

- [x] Review the reference lesson page structure and teaching flow
- [x] Expand all core Python sessions into full lesson content with explanation, steps, examples, and practice
- [x] Add all uploaded Problem Solving sessions as a dedicated five-month learning track
- [x] Add lesson detail navigation and session-level interaction inside the student portal
- [x] Verify the expanded curriculum in Arabic and English and save a checkpoint

- [x] Re-audit the original Pythoncourse.zip content and preserve full session/problem wording
- [x] Show only the four course cards on the public student entry page
- [x] Hide all Python curriculum details and roadmap before a valid student code is submitted
- [x] Show only the authenticated student's enrolled courses after code entry
- [x] Restore full source curriculum detail inside Python after authentication
- [x] Add clearly labeled optional enrichment exercises without replacing source content
- [x] Verify unauthenticated, valid-code, Arabic RTL, and English LTR flows and save a checkpoint

- [x] Add a clearly labeled optional enrichment block inside every Python lesson
- [x] Verify the updated authenticated student portal in English LTR
- [x] Save a checkpoint for the locked public course gate and full source curriculum

- [x] Remove the raw PDF/original-content panel from every Python lesson
- [x] Rewrite the lesson presentation as polished child-friendly learning sections
- [x] Add visual concept cards, guided examples, common mistakes, thinking prompts, and practice tasks
- [x] Preserve the full curriculum meaning without exposing source-file formatting
- [x] Verify the redesigned lesson in Arabic and English and save a checkpoint

- [x] Re-author source teaching substance into structured lesson content without raw PDF formatting
- [x] Verify the redesigned authenticated lesson view in English LTR
- [x] Create a new checkpoint after Arabic and English redesign verification

- [x] Rewrite the curriculum data itself into polished structured lesson content derived from the source
- [x] Verify the re-authored lesson data is used across all sessions
- [x] Save a new checkpoint after the re-authored content passes TypeScript, tests, and Arabic/English verification

- [x] Add session-specific learning goals, success criteria, and common mistakes for every remaining core session
- [x] Add session-specific learning goals, success criteria, and common mistakes for every Problem Solving session
- [x] Verify representative core and Problem Solving sessions in Arabic and English
- [x] Save a new checkpoint after the complete curriculum rewrite and bilingual verification

- [x] Re-verify representative Core and Problem Solving sessions in Arabic after the session-specific data rewrite
- [x] Create the final checkpoint after the post-rewrite Arabic and English verification

- [x] Verify one post-rewrite Problem Solving lesson in Arabic with its custom goal, success criteria, and common mistake
- [x] Create the final checkpoint after this Arabic Problem Solving verification

- [x] Create and record the new checkpoint for the verified curriculum rewrite

- [x] Extract and map Webcourse.zip lessons, explanations, questions, and examples
- [x] Add a bilingual interactive Web curriculum data model for children
- [x] Show Web course details only to students enrolled in Web after code entry
- [x] Build Web lesson cards, explanations, examples, activities, and quizzes
- [x] Add Arabic RTL and English LTR support for the Web course
- [x] Verify Web course interactions and save a checkpoint

- [x] Interactively verify Web lesson switching in the student portal
- [x] Verify Web quiz submit/reset, code copy/run, and mark-complete feedback in English and Arabic
- [x] Save a new checkpoint after the Web course interaction verification

- [x] Verify switching from Web HTML Session 1 to Session 2 changes the lesson detail panel
- [x] Verify Web-specific quiz submit and reset on the active Web lesson
- [x] Verify Web-specific code copy/run and completion feedback in English and Arabic
- [x] Save the final Web-course checkpoint after these targeted interactions
- [x] Fix /student back button spacing so it does not touch the logo
- [x] Verify /student header spacing in Arabic RTL and English LTR
- [x] Save checkpoint after fixing /student back button spacing
- [x] Align Python Sessions 1–4 with the two user-provided curriculum attachments
- [x] Preserve the requested concepts, activities, homework, and explanations in Sessions 1–4
- [x] Make all Python examples and activities executable with clear input/output behavior
- [x] Verify the updated Python Sessions 1–4 in Arabic RTL and English LTR
- [x] Run tests and save a checkpoint for the revised Python Sessions 1–4
- [x] Align Python Sessions 5–8 with the new user-provided curriculum attachment
- [x] Preserve the requested explanations, activities, homework, and bilingual content for Sessions 5–8
- [x] Make all Sessions 5–8 code examples executable in the in-browser Python runner
- [x] Verify Sessions 5–8 in Arabic RTL and English LTR
- [x] Run tests and save a checkpoint for the revised Sessions 5–8
- [x] Re-verify Python Sessions 6–8 in English LTR by opening each lesson and confirming the correct lesson title and detail content renders
- [x] Save a new checkpoint specifically for the revised Python Sessions 5–8 after complete English verification
- [x] Save the final Python Sessions 5–8 checkpoint after the confirmed English LTR verification
- [x] Rename Python Sessions 1–19 so each title matches its actual content
- [x] Replace the Python roadmap’s 3 phases with 5 content-aligned phases in Arabic and English
- [x] Verify phase and session labels in the student portal in RTL and LTR
- [x] Run tests and save a checkpoint for the Python naming and five-phase update
- [x] Save a new checkpoint specifically for the Python session renaming and five-phase roadmap update after the verified RTL/LTR review
- [x] Match the new Python curriculum attachment to the existing sessions
- [x] Update the affected Python session explanations, activities, and code examples
- [x] Rename affected sessions so each title accurately describes its content
- [x] Verify title-to-content alignment in Arabic RTL and English LTR
- [x] Run tests and save a checkpoint for the new Python curriculum update
- [x] Save a new checkpoint specifically for the Sessions 9–12 Python curriculum update after the verified RTL/LTR review
- [x] Update Sessions 13–16 using the new user-provided curriculum attachment
- [x] Rename Sessions 13–16 so each title accurately describes its content
- [x] Verify Sessions 13–16 title-to-content alignment in Arabic RTL and English LTR
- [x] Run tests and save a checkpoint for Sessions 13–16
- [x] Move Back to home into a balanced student-page header position with clear spacing from the logo
- [x] Update Python Sessions 17–18 from the new user-provided attachment
- [x] Rename Sessions 17–18 so each title accurately reflects its content
- [x] Verify the header and Sessions 17–18 in Arabic RTL and English LTR
- [x] Run tests and save a checkpoint for the Back to home and Sessions 17–18 update
- [x] Remove the standalone Problem Solving track card from the student portal
- [x] Keep Problem Solving sessions available only through the sidebar lesson list
- [x] Add top course-switcher links for every course enrolled by the student
- [x] Verify single-course and multi-course student flows in Arabic RTL and English LTR
- [x] Run tests and save a checkpoint for the student course navigation update
- [x] Hide all enrolled course content by default after student code entry
- [x] Show the selected course content only after its top course button is clicked
- [x] Allow switching between selected Python and Web course views without rendering both at once
- [x] Verify hidden, opened, and switched course states in Arabic RTL and English LTR
- [x] Run tests and save a checkpoint for the selected-course visibility update
- [x] Verify the hidden default course state in Arabic RTL after student code entry
- [x] Verify switching between Python and Web in Arabic RTL so only the selected course renders at once
- [x] Save a checkpoint after the completed selected-course visibility verification
- [x] Run tests again after the final selectedCourse reset change in StudentPortal.tsx
- [x] Save a new checkpoint for selected-course visibility after the completed Arabic and English verification
