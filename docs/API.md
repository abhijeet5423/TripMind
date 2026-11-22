# TripMind — RESTful API Specification

> **Version:** 1.0.0  
> **Base URLs:**  
> - **Production:** `https://tripmind-0b2x.onrender.com/api` (proxied via Vercel edge rewrite at `https://trip-mind-brown.vercel.app/api`)  
> - **Local Development:** `http://localhost:5000/api`  
> **Protocol:** HTTPS (Production) / HTTP (Local)  
> **Content-Type:** `application/json`

---

## 1. Global API Standards

### 1.1 Authentication & Session Cookies
TripMind implements stateless authentication via signed JSON Web Tokens (JWT) stored exclusively in HttpOnly, SameSite, Secure cookies named `token` (per [ADR-010](../DECISIONS.md)).
- Clients do **not** transmit `Authorization: Bearer <token>` headers.
- Browser HTTP clients must send requests with credentials enabled (`credentials: 'include'` for Fetch; `withCredentials: true` for Axios).
- Sessions expire after 15 minutes of inactivity.
- Tokens issued prior to a password reset are automatically revoked across all devices via the `passwordChangedAt` timestamp check in the `authenticateToken` middleware.

### 1.2 CSRF & Multi-Origin Defense
All state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) are protected by the `csrfProtection` middleware:
- Validates the `Origin` or `Referer` header against an allowlist of trusted origins (`https://trip-mind-brown.vercel.app`, trusted Vercel preview URLs, and `http://localhost:5173`).
- Rejects untrusted cross-origin mutations with HTTP 403 `CSRF_DETECTED`.
- Validates standard browser AJAX markers (`X-Requested-With: XMLHttpRequest`).

### 1.3 Standardized Response Envelope
Every endpoint returns a predictable JSON envelope:

#### Success Envelope (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Error Envelope (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable explanation of error.",
    "details": [
      {
        "field": "budget",
        "message": "Budget must be a positive integer."
      }
    ]
  }
}
```
*Rule:* The `details` array is guaranteed to be present as an array `[]` (never `null` or `undefined`).

### 1.4 Rate Limiting Tiers
Requests are throttled by IP using in-memory sliding windows:

| Tier | Window | Limit | Target Endpoints | Error Code |
| :--- | :---: | :---: | :--- | :--- |
| **General API** | 15 min | 120 req | `/api/*` | `RATE_LIMIT_EXCEEDED` |
| **Authentication** | 15 min | 10 req | `/api/auth/login`, `/api/auth/register` | `AUTH_RATE_LIMIT_EXCEEDED` |
| **Forgot Password** | 15 min | 5 req | `/api/auth/forgot-password` | `RATE_LIMIT_EXCEEDED` |
| **Reset Password** | 15 min | 10 req | `/api/auth/reset-password` | `RATE_LIMIT_EXCEEDED` |
| **Resend Verification** | 15 min | 3 req | `/api/auth/resend-verification` | `RATE_LIMIT_EXCEEDED` |
| **Verify Email** | 15 min | 15 req | `/api/auth/verify-email` | `RATE_LIMIT_EXCEEDED` |
| **AI Generation** | 1 min | 15 req | `/api/trips/:id/generate-itinerary` | `RATE_LIMIT_EXCEEDED` |
| **AI Assistant** | 1 min | 15 req | `/api/assistant/messages` | `RATE_LIMIT_EXCEEDED` |
| **Public Share** | 1 min | 60 req | `/api/trips/shared/:token` | `RATE_LIMIT_EXCEEDED` |

---

## 2. Authentication Endpoints (`/api/auth`)

### 2.1 Register User
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Auth:** Public
- **Rate Limit:** 10 requests / 15 minutes
- **Request Body:**
  ```json
  {
    "name": "Jane Traveler",
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Validation Rules:**
  - `name`: String, 2–100 characters.
  - `email`: Normalized email string, max 255 characters.
  - `password`: String, 8–72 characters (bcrypt limit).
  - Client-supplied `role` is strictly prohibited (mass-assignment protection).
- **Behavior:**
  - Creates user record with `isEmailVerified: false`.
  - Generates 32-byte cryptographic verification token (24-hour expiration) and stores SHA-256 hash.
  - Sends transactional verification email.
  - *Atomic Rollback:* If email delivery fails or SMTP is unconfigured, user document is rolled back from MongoDB.
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6741b0b5e8295b1234567890",
        "name": "Jane Traveler",
        "email": "jane@example.com",
        "role": "user",
        "isEmailVerified": false,
        "createdAt": "2026-11-22T19:00:00.000Z"
      }
    },
    "message": "Registration successful. Please check your email to verify your account."
  }
  ```
- **Error Codes:** `400 VALIDATION_ERROR`, `409 EMAIL_ALREADY_EXISTS`, `503 EMAIL_SERVICE_UNCONFIGURED`.

---

### 2.2 Verify Email Address
- **Method:** `POST`
- **Path:** `/api/auth/verify-email`
- **Auth:** Public
- **Rate Limit:** 15 requests / 15 minutes
- **Request Body:**
  ```json
  {
    "token": "4a7b9c1d2e3f...64hexchars"
  }
  ```
- **Behavior:**
  - Atomically finds user matching SHA-256 hash of token where `emailVerificationExpires > now`.
  - Sets `isEmailVerified: true` and `$unset`s token hash and expiration fields (single-use guarantee).
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6741b0b5e8295b1234567890",
        "email": "jane@example.com",
        "isEmailVerified": true
      }
    },
    "message": "Email address verified successfully. You may now log in."
  }
  ```
- **Error Codes:** `400 INVALID_TOKEN`, `400 TOKEN_EXPIRED`.

---

### 2.3 Resend Verification Email
- **Method:** `POST`
- **Path:** `/api/auth/resend-verification`
- **Auth:** Public
- **Rate Limit:** 3 requests / 15 minutes
- **Request Body:**
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Anti-Enumeration Contract:** Always returns HTTP 200 with an identical message regardless of whether the email is registered, unverified, already verified, or unknown.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": null,
    "message": "If an unverified account exists for that email, a new verification link has been sent."
  }
  ```

---

### 2.4 Login User
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Auth:** Public
- **Rate Limit:** 10 requests / 15 minutes
- **Request Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Verification Gating:**
  - Evaluates `user.isEmailVerified !== false` (legacy accounts with `isEmailVerified: undefined` remain grandfathered in).
  - Unverified accounts return HTTP 403 `EMAIL_NOT_VERIFIED`.
- **Success Response (200 OK):**
  - Sets HttpOnly `Set-Cookie: token=<jwt>; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=900`.
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6741b0b5e8295b1234567890",
        "name": "Jane Traveler",
        "email": "jane@example.com",
        "role": "user",
        "isEmailVerified": true,
        "createdAt": "2026-11-22T19:00:00.000Z"
      }
    },
    "message": "Login successful"
  }
  ```
- **Error Codes:** `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS` (anti-enumeration message: "Invalid email or password"), `403 EMAIL_NOT_VERIFIED`.

---

### 2.5 Current Authenticated User Profile
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Auth:** Requires valid `token` cookie
- **Cross-Device Invalidation:** Fails with HTTP 401 `UNAUTHORIZED` if user changed password after token issuance.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "6741b0b5e8295b1234567890",
        "name": "Jane Traveler",
        "email": "jane@example.com",
        "role": "user",
        "isEmailVerified": true,
        "createdAt": "2026-11-22T19:00:00.000Z"
      }
    },
    "message": "Authenticated user retrieved successfully"
  }
  ```
- **Error Codes:** `401 UNAUTHORIZED`.

---

### 2.6 Logout User
- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Auth:** Public / Authenticated
- **Behavior:** Clears `token` cookie (`Max-Age=0`).
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": null,
    "message": "Logged out successfully"
  }
  ```

---

### 2.7 Forgot Password (Initiate Recovery)
- **Method:** `POST`
- **Path:** `/api/auth/forgot-password`
- **Auth:** Public
- **Rate Limit:** 5 requests / 15 minutes
- **Request Body:**
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Anti-Enumeration Contract:** Always returns HTTP 200 with identical generic response.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": null,
    "message": "If an account exists with that email address, password reset instructions have been sent."
  }
  ```

---

### 2.8 Reset Password (Complete Recovery)
- **Method:** `POST`
- **Path:** `/api/auth/reset-password`
- **Auth:** Public
- **Rate Limit:** 10 requests / 15 minutes
- **Request Body:**
  ```json
  {
    "token": "1a2b3c...64hexchars",
    "password": "NewSecurePassword123!",
    "confirmPassword": "NewSecurePassword123!"
  }
  ```
- **Behavior:**
  - Hashes token via SHA-256 and finds user where `passwordResetExpires > now`.
  - Verifies `password === confirmPassword` and 8–72 characters length.
  - Updates `user.password` (hashed via Mongoose `pre('save')` bcrypt hook).
  - Unsets `passwordResetTokenHash` and `passwordResetExpires`.
  - Sets `user.passwordChangedAt = new Date()`, globally revoking prior JWT sessions.
  - Clears `token` cookie on resetting device.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": null,
    "message": "Password reset successfully. You may now log in with your new password."
  }
  ```
- **Error Codes:** `400 VALIDATION_ERROR`, `400 INVALID_TOKEN`, `400 TOKEN_EXPIRED`.

---

## 3. Trip Management Endpoints (`/api/trips`)

### 3.1 Create Trip
- **Method:** `POST`
- **Path:** `/api/trips`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "title": "Autumn Temple Pilgrimage",
    "destination": "Kyoto, Japan",
    "startingLocation": "Tokyo, Japan",
    "departureDate": "2027-10-12",
    "returnDate": "2027-10-18",
    "numberOfTravellers": 2,
    "budget": 180000,
    "currency": "INR",
    "travelStyle": "Cultural & Immersive",
    "pace": "Moderate",
    "interests": ["Temples", "Gardens", "Tea Ceremonies"],
    "dietaryPreferences": ["Vegetarian"]
  }
  ```
- **Validation Rules:**
  - `destination`: 2–100 characters.
  - `startingLocation`: 2–100 characters.
  - `departureDate`, `returnDate`: ISO-8601 date strings (`returnDate >= departureDate`, max duration 30 days).
  - `numberOfTravellers`: Integer between 1 and 50.
  - `budget`: Positive number.
  - `currency`: Default `'INR'`, supported currencies: `'INR'`, `'USD'`, `'EUR'`, `'GBP'`, `'JPY'`.
  - Protected fields (`userId`, `_id`, `role`, `shareSettings`) are strictly rejected with HTTP 400.
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "trip": {
        "_id": "6741b0b5e8295b1234567899",
        "userId": "6741b0b5e8295b1234567890",
        "title": "Autumn Temple Pilgrimage",
        "destination": "Kyoto, Japan",
        "startingLocation": "Tokyo, Japan",
        "departureDate": "2027-10-12T00:00:00.000Z",
        "returnDate": "2027-10-18T00:00:00.000Z",
        "numberOfTravellers": 2,
        "budget": 180000,
        "currency": "INR",
        "status": "draft",
        "days": [],
        "budgetSummary": {
          "totalEstimated": 0,
          "remaining": 180000,
          "categories": { ... }
        },
        "createdAt": "2026-11-22T19:00:00.000Z"
      }
    },
    "message": "Trip created successfully"
  }
  ```

---

### 3.2 List User Trips
- **Method:** `GET`
- **Path:** `/api/trips`
- **Auth:** Required
- **Query Parameters:**
  - `page`: Integer >= 1 (default: `1`).
  - `limit`: Integer 1–100 (default: `10`).
  - `status`: Optional enum (`'draft'`, `'upcoming'`, `'completed'`).
  - `search`: Optional string (case-insensitive destination search).
- **Ownership Filter:** Scoped strictly to `userId: req.user.id`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "trips": [ ... ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "totalTrips": 3,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPrevPage": false
      }
    },
    "message": "Trips retrieved successfully"
  }
  ```

---

### 3.3 Get Single Trip
- **Method:** `GET`
- **Path:** `/api/trips/:id`
- **Auth:** Required
- **Ownership Filter & IDOR Defense:** Query requires `{ _id: id, userId: req.user.id }`.
- **Anti-Enumeration:** Requesting an unowned or nonexistent trip returns uniform HTTP 404 `NOT_FOUND`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "trip": { ... }
    },
    "message": "Trip retrieved successfully"
  }
  ```

---

### 3.4 Update Trip Metadata
- **Method:** `PATCH`
- **Path:** `/api/trips/:id`
- **Auth:** Required
- **Request Body:** Partial object containing only modified fields.
- **Protected Fields Guard:** Updates attempting to mutate `_id`, `userId`, `createdAt`, `days`, `budgetSummary`, or `shareSettings` are rejected with HTTP 400.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "trip": { ... }
    },
    "message": "Trip updated successfully"
  }
  ```

---

### 3.5 Delete Trip
- **Method:** `DELETE`
- **Path:** `/api/trips/:id`
- **Auth:** Required
- **Ownership Guard:** Query-level atomic deletion `{ _id: id, userId: req.user.id }`.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": null,
    "message": "Trip deleted successfully"
  }
  ```

---

## 4. AI Itinerary Generation Endpoint

### 4.1 Generate AI Itinerary
- **Method:** `POST`
- **Path:** `/api/trips/:id/generate-itinerary`
- **Auth:** Required
- **Rate Limit:** 15 requests / 1 minute
- **Behavior:**
  - Assembles trip context (`destination`, `dates`, `budget`, `style`, `pace`, `interests`).
  - Calls Google Gemini 2.5 Flash Lite (`@google/genai`) using structured JSON schema (`geminiItinerarySchema`).
  - Executes Tier-2 semantic validation on the returned itinerary (date sequence, party-level budget summation, 2–8 activities/day, WGS84 coordinate bounds).
  - Atomically saves itinerary subdocuments (`days`, `budgetSummary`, `summary`, `travelTips`) into the parent `Trip` document.
  - *Invariant:* If generation or validation fails, existing trip itinerary is 100% preserved.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "tripId": "6741b0b5e8295b1234567899",
      "itinerary": {
        "destination": "Kyoto, Japan",
        "summary": "Immerse in the peaceful temple grounds and bamboo groves of Arashiyama.",
        "travelTips": [ ... ],
        "budget": {
          "totalEstimated": 164000,
          "currency": "INR",
          "categories": { ... }
        },
        "days": [
          {
            "dayNumber": 1,
            "date": "2027-10-12T00:00:00.000Z",
            "theme": "Arashiyama Bamboo & Zen Sanctuaries",
            "activities": [
              {
                "time": "08:30 AM",
                "timeSlot": "morning",
                "title": "Early Morning Walk in Arashiyama Bamboo Grove",
                "description": "Experience the soaring bamboo stalks in morning solitude.",
                "locationName": "Arashiyama Bamboo Grove",
                "category": "activity",
                "cost": 0,
                "latitude": 35.0168,
                "longitude": 135.6712
              }
            ]
          }
        ]
      }
    },
    "message": "Itinerary generated and saved successfully"
  }
  ```
- **Error Codes:** `400 INVALID_TRIP_CONTEXT`, `404 NOT_FOUND`, `422 ITINERARY_VALIDATION_FAILED`, `429 GEMINI_QUOTA_EXCEEDED`, `502 GEMINI_PARSE_ERROR`, `503 GEMINI_SERVICE_UNAVAILABLE`.

---

## 5. Granular Activity Management Endpoints

### 5.1 Add Activity to Itinerary Day
- **Method:** `POST`
- **Path:** `/api/trips/:tripId/activities`
- **Auth:** Required
- **Request Body:**
  ```json
  {
    "dayNumber": 1,
    "time": "02:00 PM",
    "timeSlot": "afternoon",
    "title": "Traditional Tea Ceremony at Camellia",
    "description": "Participate in an authentic Uji matcha ceremony.",
    "locationName": "Camellia Tea House",
    "category": "food",
    "cost": 4500,
    "latitude": 34.9983,
    "longitude": 135.7825
  }
  ```
- **Automatic Budget Recalculation:** Centralized `budgetService.recalculateTripBudget()` immediately recalculates all 6 categories and total expenditure.
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "activity": {
        "_id": "6741b0b5e8295b9876543210",
        "title": "Traditional Tea Ceremony at Camellia",
        "category": "food",
        "cost": 4500,
        ...
      },
      "budgetSummary": { ... }
    },
    "message": "Activity added successfully"
  }
  ```

---

### 5.2 Edit Itinerary Activity
- **Method:** `PATCH`
- **Path:** `/api/trips/:tripId/days/:dayId/activities/:activityId`
- **Auth:** Required
- **Request Body:** Partial update fields (`title`, `time`, `timeSlot`, `category`, `cost`, `description`, `locationName`, `latitude`, `longitude`).
- **Success Response (200 OK):** Returns updated activity and freshly recalculated `budgetSummary`.

---

### 5.3 Delete Itinerary Activity
- **Method:** `DELETE`
- **Path:** `/api/trips/:tripId/days/:dayId/activities/:activityId`
- **Auth:** Required
- **Success Response (200 OK):** Returns confirmation and freshly recalculated `budgetSummary`.

---

## 6. Shareable Itinerary Endpoints (`/api/trips/.../share`)

### 6.1 Get Share Settings (Owner Only)
- **Method:** `GET`
- **Path:** `/api/trips/:id/share`
- **Auth:** Required (Owner only)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "isShared": true,
      "includeBudget": true,
      "shareUrl": "https://trip-mind-brown.vercel.app/shared/4a7b9c1d...",
      "shareToken": "4a7b9c1d...64hexchars"
    },
    "message": "Share settings retrieved successfully"
  }
  ```

---

### 6.2 Update Share Settings (Enable / Disable / Revoke)
- **Method:** `POST`
- **Path:** `/api/trips/:id/share`
- **Auth:** Required (Owner only)
- **Request Body:**
  ```json
  {
    "isShared": true,
    "includeBudget": false
  }
  ```
- **Behavior:**
  - When enabling: Generates high-entropy 32-byte hex token, hashes via SHA-256 for index lookup, encrypts token at rest with AES-256-GCM.
  - When disabling: Revokes token immediately. Subsequent public requests return uniform 404.
  - When re-enabling: Generates a brand new token; previously revoked tokens remain dead.
- **Success Response (200 OK):** Returns updated share settings and share URL.

---

### 6.3 Public Shared Itinerary View
- **Method:** `GET`
- **Path:** `/api/trips/shared/:token`
- **Auth:** Public
- **Rate Limit:** 60 requests / 1 minute
- **Token Format Validation:** Strictly requires 64 hex characters (32 bytes). Malformed tokens return uniform 404.
- **Data Minimization:** Response explicitly scrubs `userId`, `__v`, internal credentials, and owner contact details. If `includeBudget` is `false`, all financial fields are stripped.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "trip": {
        "title": "Autumn Temple Pilgrimage",
        "destination": "Kyoto, Japan",
        "startingLocation": "Tokyo, Japan",
        "departureDate": "2027-10-12T00:00:00.000Z",
        "returnDate": "2027-10-18T00:00:00.000Z",
        "numberOfTravellers": 2,
        "summary": "...",
        "travelTips": [ ... ],
        "days": [ ... ]
      }
    },
    "message": "Shared itinerary retrieved successfully"
  }
  ```
- **Error Codes:** `404 NOT_FOUND` (Uniform anti-enumeration error for invalid, tampered, expired, or revoked tokens).

---

## 7. Context-Aware AI Travel Assistant (`/api/assistant`)

### 7.1 Send Assistant Message
- **Method:** `POST`
- **Path:** `/api/assistant/messages`
- **Auth:** Required
- **Rate Limit:** 15 requests / 1 minute
- **Request Body:**
  ```json
  {
    "tripId": "6741b0b5e8295b1234567899",
    "message": "Where should we stop for lunch on Day 2 near Fushimi Inari?",
    "history": [
      { "role": "user", "content": "Hello!" },
      { "role": "assistant", "content": "Welcome! How can I help with Kyoto?" }
    ]
  }
  ```
- **Validation & Guardrails:**
  - `message`: 1–1000 characters.
  - `history`: Array, maximum 6 messages (3 conversation turns) to maintain bounded context.
  - Allowed roles: strictly `'user'` and `'assistant'` (rejects `'system'` or `'developer'`).
  - Assembles prompt with strict system instructions prohibiting prompt injection and grounding recommendations in the user's specific itinerary and budget.
  - 30-second timeout guard with `AbortController` cancellation.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "reply": "Near Fushimi Inari, I recommend Kendon Shoya for handmade udon...",
      "meta": {
        "model": "gemini-3.5-flash-lite",
        "tripId": "6741b0b5e8295b1234567899"
      }
    },
    "message": "Assistant reply generated successfully"
  }
  ```

---

## 8. Destination Discovery Endpoints (`/api/destinations`)

### 8.1 List Curated Destinations
- **Method:** `GET`
- **Path:** `/api/destinations`
- **Auth:** Public
- **Query Parameters:**
  - `category`: Optional filter (`'All'`, `'Culture & Heritage'`, `'Mountain Escape'`, `'Tropical Escape'`, `'Adventure'`, `'Coastal Escape'`).
  - `search`: Debounced text search matching destination name, country, or tags.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "destinations": [
        {
          "id": "kyoto-japan",
          "name": "Kyoto",
          "country": "Japan",
          "category": "Culture & Heritage",
          "tagline": "Ancient Temples & Zen Gardens",
          "image": "/assets/destinations/kyoto-japan.webp",
          "coordinates": { "latitude": 35.0116, "longitude": 135.7681 },
          "estimatedDailyBudget": { "amount": 12000, "currency": "INR" },
          "attribution": {
            "photographer": "Su San Lee",
            "source": "Unsplash",
            "sourceUrl": "https://unsplash.com/photos/..."
          }
        }
      ]
    },
    "message": "Destinations retrieved successfully"
  }
  ```

---

### 8.2 Get Destination by Identifier
- **Method:** `GET`
- **Path:** `/api/destinations/:identifier`
- **Auth:** Public
- **Success Response (200 OK):** Returns single curated destination object with rich highlights and travel tips.

---

## 9. Infrastructure Health Endpoint

### 9.1 Health Check
- **Method:** `GET`
- **Path:** `/api/health`
- **Auth:** Public
- **Rate Limit:** Exempt
- **Success Response (200 OK):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-11-22T19:00:00.000Z",
    "uptime": 14250.32,
    "database": {
      "status": "connected",
      "host": "ac-iei8fya-shard-00-01.75lt4y7.mongodb.net"
    }
  }
  ```
