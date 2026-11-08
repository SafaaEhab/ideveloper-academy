# Cloudinary achievement-photo upload

The application already uploads through the server; the browser only sends a
data URL to `admin.uploadAchievementImage`. The server signs the Cloudinary
request with the API secret, which is never sent to the browser.

## Environment variables

Set these in the Vercel project (Production and Preview) and in any Render/Docker
runtime that serves the API:

| Variable | Required | Purpose |
| --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Public API key used in the signed upload request |
| `CLOUDINARY_API_SECRET` | Yes | Server-only signing secret |

The exact names are the ones read by `server/_core/env.ts` and
`server/_core/cloudinary.ts`. Do not prefix the key or secret with `VITE_`; Vite
would expose it to every browser.

`VITE_` variables are public by definition, so never put the Cloudinary API key
or secret in one.

## What to do in Vercel

1. Open the Vercel project → Settings → Environment Variables.
2. Add `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` for Production and
   Preview. `CLOUDINARY_CLOUD_NAME` is already present in the audited project,
   but confirm it is the intended cloud.
3. Redeploy so the serverless function picks up the new values.
4. Sign in as an admin → Achievements → Upload photo. Pick PNG/JPEG/WebP/GIF/AVIF
   under 8 MB.
5. Confirm the returned `https://res.cloudinary.com/...` URL appears in the form
   and renders on the public homepage.

## Safe failure behaviour

- Missing credentials: upload returns a clear message listing the missing
  variable names. The admin can still paste a valid HTTPS URL or `/images/...`
  path.
- Unsupported type or >8 MB: rejected before any Cloudinary request.
- Cloudinary error: the server returns the provider's message; the admin UI
  shows it as a toast instead of a broken preview.
- Every achievement image has a local fallback (`/images/achievement-placeholder.svg`)
  rendered by `SafeImage`, so a failed image request never shows a broken icon.

## Verification status

Code-level upload validation and missing-credential handling are covered by
`server/cloudinary.test.ts`. A real upload cannot be verified until the owner
adds `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` to the deployment.
