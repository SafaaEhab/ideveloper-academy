---
name: ideveloper-public-site-guide
description: Navigate the public iDeveloper Academy website, understand registration, and avoid private areas.
---

# iDeveloper Academy public site guide

Use this skill when an agent needs to explain the academy, find a public page, or direct a parent to registration.

## Public routes

- `/` — academy overview, programmes, achievements and contact details.
- `/courses` — Scratch, Robotics, Web and Python course cards with current availability.
- `/register` — public registration form.
- `/terms` — terms and conditions.
- `/privacy` — privacy policy.
- `/auth.md` — authentication guidance for agents.
- `/api.md` — public API overview.

## Registration

The registration form stores a request in the academy database with a Pending status. WhatsApp is an optional follow-up after the request is saved; it is not the only submission path.

Collect only what the form asks for. Do not invent student records or submit data for a person who has not asked to register.

## Authentication

The academy uses first-party session authentication, not an OAuth/OIDC authorization server:

- Students sign in with an academy access code at `/student`.
- Administrators and instructors use the email/password login at `/login`.

There is no public agent-registration endpoint and no anonymous access to student, instructor or admin data. Do not attempt to discover or bypass those areas.
