---
name: ideveloper-course-discovery
description: Discover iDeveloper Academy courses, current availability, and the correct public booking or waiting-list action.
---

# iDeveloper Academy course discovery

Use this skill when a user asks which programming or robotics courses the academy offers, whether a course is running, or how to book or join a waiting list.

## Endpoint

`GET https://ideveloper-academy.vercel.app/api/trpc/site.courses`

The response is a tRPC JSON envelope. The course array is normally at `result.data.json`; superjson metadata may be present under `result.data.meta`.

## Status values

- `live` — the course is running. Use the public course page and the booking link.
- `coming_soon` — do not present it as bookable. Offer the public waiting-list action.
- `waiting_list` — offer the public waiting-list action.

## Public pages

- Course catalogue: `https://ideveloper-academy.vercel.app/courses`
- Homepage: `https://ideveloper-academy.vercel.app/`
- Registration: `https://ideveloper-academy.vercel.app/register`

## Privacy boundary

Do not request or use `/admin`, `/student`, `/instructor`, `/api/trpc/admin.*`, `/api/trpc/instructor.*`, `/api/trpc/portal.*`, or assignment-file downloads. Those are authenticated areas and are not public course-discovery resources.
