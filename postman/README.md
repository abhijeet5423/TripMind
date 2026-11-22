# TripMind — Postman API Collection & Testing Guide

This directory contains the official, reusable Postman collection and local environment configuration for TripMind's backend REST APIs.

## 1. Files Included

- **`TripMind.postman_collection.json`**: The complete collection of requests covering Health, Authentication, User Profile, Trips, AI Itinerary, Activities, Public Sharing, Destinations, and Edge/Error Cases.
- **`TripMind.local.postman_environment.json`**: Environment variables configured for local development (`baseUrl: http://127.0.0.1:5000`).
- **`README.md`**: This guide.

---

## 2. Collection Structure & Scope

The collection is organized into 9 logical folders:

1. **`1. Health`**: Uptime monitoring (`GET /api/health`), database connection state, and Helmet security headers verification.
2. **`2. Authentication`**: Traveler registration (`POST /api/auth/register`), login (`POST /api/auth/login`), logout (`POST /api/auth/logout`), plus edge cases (duplicate email, privilege escalation with `role: admin`, weak passwords, invalid credentials, and malformed bodies).
3. **`3. User Profile`**: Authenticated profile retrieval (`GET /api/auth/me`), plus unauthenticated (401) and malformed cookie edge cases.
4. **`4. Trips`**: Full CRUD operations on trips (`POST /api/trips`, `GET /api/trips`, `GET /api/trips/:id`, `PATCH /api/trips/:id`, `DELETE /api/trips/:id`), plus edge cases (missing required fields, negative budget, inverted date ranges, decimal travellers, protected field injection, invalid status filters, unknown query parameters, and anti-enumeration 404 tests).
5. **`5. Itinerary`**: AI Itinerary generation endpoint (`POST /api/trips/:id/generate-itinerary`) edge cases (invalid ObjectId, unowned trip anti-enumeration).
6. **`6. Activities`**: Embedded activity management (`POST /api/trips/:id/days/:dayId/activities`, `PATCH ...`, `DELETE ...`), plus edge cases (missing title, invalid category, mismatched coordinates, non-existent day/activity IDs).
7. **`7. Sharing`**: Public read-only itinerary link lifecycle (`POST /api/trips/:id/share`, `GET /api/trips/shared/:token`), public view data minimization verification, mutation blocking, and immediate token revocation verification.
8. **`8. Destinations`**: Curated editorial destination catalog endpoints (`GET /api/destinations`, `GET /api/destinations/:identifier`) and category filter testing.
9. **`9. Rate Limiting and Error Cases`**: 404 route handling, malformed JSON body handling (`INVALID_JSON`), and end-to-end teardown.

---

## 3. Quickstart: Importing into Postman

### Step 1 — Import the Collection and Environment
1. Launch the **Postman** desktop application (or Postman Web).
2. Click **Import** (top left).
3. Drag and drop or browse to:
   - `postman/TripMind.postman_collection.json`
   - `postman/TripMind.local.postman_environment.json`
4. In the top-right environment selector, select **TripMind Local Environment**.

### Step 2 — Start the Backend Server
Ensure the Express backend is running on `http://127.0.0.1:5000`:
```bash
npm --prefix server run dev
```

### Step 3 — Execute the Collection
- You can execute requests individually in sequence, or run the entire folder via Postman's **Collection Runner**.
- **Execution Order:**
  1. `Health Check`
  2. `Register Traveler` / `Login Traveler` (establishes session cookie)
  3. `Create Trip` (automatically captures `tripId` to environment)
  4. `Get Single Trip` (captures `dayId` to environment)
  5. `Add Activity` (captures `activityId` to environment)
  6. `Enable Sharing` (captures `shareToken` to environment)
  7. Public sharing tests, edge cases, and teardown deletion.

---

## 4. Running via Newman CLI (Automated CI / Scripting)

You can run the collection headlessly in your terminal or CI pipeline using `newman`:

```bash
# Run collection with the local environment
npx newman run postman/TripMind.postman_collection.json \
  -e postman/TripMind.local.postman_environment.json \
  --reporters cli
```

---

## 5. Authentication & Cookie Jar Architecture

TripMind implements **ADR-010**: Stateless JWT access tokens stored exclusively in an **`HttpOnly`** cookie named `token`.
- When you execute **`POST /api/auth/login`**, the server returns `Set-Cookie: token=...; HttpOnly; SameSite=Lax`.
- Postman's native cookie jar automatically captures this cookie for `127.0.0.1` and includes it in all subsequent requests.
- No manual Bearer token copying is required.

---

## 6. Security & Credential Hygiene

- **Zero Stored Secrets:** The committed files do not contain real user credentials, active JWTs, API keys, or production database connection strings.
- **Dynamic IDs:** All trip IDs, day IDs, activity IDs, and cryptographic share tokens are captured dynamically at runtime using test scripts (`pm.environment.set(...)`).
- **Safe Placeholders:** Safe placeholders are provided in `TripMind.local.postman_environment.json`.
