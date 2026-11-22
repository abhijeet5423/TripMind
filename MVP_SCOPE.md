# TripMind — MVP Scope & Roadmap

> **Document Status:** Active Baseline  
> **Rule:** Do not mark unimplemented features as completed. All features listed below are currently pending implementation unless verified through tests and logged in [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md).

---

## 1. Scope Categorization Overview

| Tier | Category | Description | Target Phase |
| :--- | :--- | :--- | :--- |
| **Tier 1** | **Essential MVP Features** | Core functional scope required for a complete, end-to-end user experience. | Phase 1 (MVP) |
| **Tier 2** | **Optional Extensions** | High-value enhancements to be tackled only after all Tier 1 features are verified. | Phase 1.5 |
| **Tier 3** | **Future Features** | Explicitly out-of-scope for the MVP; deferred to subsequent major releases. | Phase 2.0+ |

---

## 2. Development Sequencing Roadmap

Implementation across the TripMind codebase must strictly follow this order. Foundation and landing page work must precede authentication and trip management:

```
Stage 1: Project Foundation & Layout Shell
   └── Vite setup, Tailwind CSS v4 @theme tokens, base UI layout shell, and Axios client.
Stage 2: Landing Page & Editorial Showcase
   └── Hero, brand aesthetics, feature highlights, and interactive preview cards.
Stage 3: User Authentication & Accounts
   └── Registration, login, User model with single-point bcrypt hashing, and session management.
Stage 4: Trip CRUD & Itinerary Workspace
   └── Trip model with embedded days/activities/budget, dashboard, and day-wise editing.
Stage 5: AI Itinerary, Maps & Budget Analytics
   └── Backend LLM proxy, Leaflet + OSM map markers, and Recharts expense graphs.
```

---

## 3. Essential MVP Features (Tier 1 — In Scope)

### 3.1 Stage 1 & 2: Landing Page & Foundation
- **Description:** Welcoming, editorial-styled landing page introducing TripMind's core value proposition, built atop the core layout shell.
- **Acceptance Criteria:**
  - [x] Hero section featuring editorial headline, value statement, and primary CTA buttons ("Start Planning", "Explore Destinations").
  - [x] Feature highlights section detailing AI planning, interactive maps, and budget tracking.
  - [x] Interactive preview or visual mock of an editorial itinerary card adhering to the Warm Ivory and Forest Green palette.
  - [x] Responsive navigation header with links to Login/Register and a clean footer with project information.
- **Current Status:** 🟢 Completed (Hero, Feature Highlights, Destination Discovery grid, global AI Assistant launcher, and responsive layout fully verified)

### 3.2 Stage 3: User Registration and Login (Authentication)
- **Description:** Secure user authentication using JWT and salted password hashing.
- **Acceptance Criteria:**
  - [x] Registration backend endpoint (`POST /api/auth/register`) with server-side validation, duplicate email handling (HTTP 409), and bcrypt UTF-8 limits. *(Backend Registration API Completed)*
  - [x] Registration form (`client/src/pages/RegisterPage.jsx`) with client-side validation (2–100 chars name, email format, 8-char min, bcrypt 72-byte limit). *(Frontend Registration Completed)*
  - [x] Login backend endpoint (`POST /api/auth/login`) with input validation, generic credential error handling (HTTP 401), and HttpOnly cookie dispatch. *(Backend Login API Completed)*
  - [x] Login form (`client/src/pages/LoginPage.jsx`) with client validation, password reveal toggle, loading states, and generic error display. *(Frontend Login Completed)*
  - [x] Password hashing handled strictly once via Mongoose `pre('save')` hook using `bcrypt` (10 salt rounds); services pass raw validated passwords. *(User model implemented)*
  - [x] Issue short-lived JWT access token (15m) stored exclusively in an HttpOnly Secure cookie upon successful authentication per ADR-010. *(JWT Authentication Completed)*
  - [x] Reusable backend authentication middleware (`server/src/middleware/authMiddleware.js`) verifying cookie JWT and attaching `req.user`. *(Backend Auth Middleware Completed)*
  - [x] Protected profile endpoint (`GET /api/auth/me`) retrieving current user session with safe fields (`id`, `name`, `email`, `role`, `createdAt`). *(Backend Profile API Completed)*
  - [x] Protected route handling in React Router (`ProtectedRoute.jsx`, `PublicOnlyRoute.jsx`, redirecting unauthenticated users to `/login` and authenticated users to `/dashboard`). *(Frontend Route Protection Completed)*
  - [x] Stateless logout functionality (`POST /api/auth/logout`) clearing client HttpOnly cookies and resetting React AuthContext; server-side token revocation is deferred per ADR-004. *(Logout Completed)*
- **Current Status:** 🟢 Completed (End-to-end full-stack authentication, cookie session management, route protection, and UI integration complete)

### 3.3 Stage 4: Trip CRUD Management (Create, View, Update, Delete)
- **Description:** Complete lifecycle management for user trips.
- **Acceptance Criteria:**
  - [x] **Backend Create API:** Authenticated `POST /api/trips` endpoint with strict request validation, ownership enforcement (`req.user.id`), mass assignment defense, and persistence in MongoDB. *(Day 16 Completed)*
  - [x] **Backend List API:** Authenticated `GET /api/trips` endpoint retrieving user-owned trips with pagination (`page`, `limit`), sorting (`createdAt` descending), and status filtering (`draft`, `upcoming`, `completed`). *(Day 17 Completed)*
  - [x] **Frontend Create UI:** Modal or form to define a new trip with client-side validation, error mapping, and immediate state synchronization via `TripContext` and `CreateTripModal.jsx`. *(Day 20 Completed)*
  - [x] **Backend Single-Trip Retrieval API:** Authenticated `GET /api/trips/:id` endpoint with MongoDB ObjectId parameter validation, database query-level ownership filtering (`_id` and `userId`), anti-enumeration 404 responses, and data isolation. *(Day 18 Completed)*
  - [x] **View (Single Trip Frontend):** Trip detail page displaying overview, dates, duration, total budget, and associated daily itineraries (`TripDetailPage.jsx`). *(Completed Day 29)*
  - [x] **Backend Update API (PATCH):** Authenticated `PATCH /api/trips/:id` partial update endpoint with allowed field filtering, protected field rejection (`_id`, `userId`, `createdAt`, etc.), concurrency-safe conditional atomic date queries, nested subdocument preservation via dot-notation, cover image null clearing, array length limits (30 interests, 20 dietary), and query-level ownership filtering. *(Day 19 & Day 19.1 Hardened)*
  - [x] **Backend Delete API (DELETE):** Authenticated `DELETE /api/trips/:id` endpoint with query-level ownership enforcement (`Trip.findOneAndDelete({ _id: tripId, userId: user._id })`), atomically removing the parent trip and all embedded subdocuments (`days`, `activities`, `budgetSummary`). *(Day 19 Completed)*
  - [x] **Update (Frontend UI):** Ability to edit trip metadata (dates, destination, origin, budget, travellers, title, status, travel preferences) from the dashboard using the authenticated `PATCH /api/trips/:id` endpoint with partial delta computation and immediate in-memory synchronization via `TripContext` and `EditTripModal.jsx`. *(Day 22 Completed)*
  - [x] **Delete (Frontend UI):** Safe trip deletion from dashboard with editorial confirmation dialog (`DeleteTripModal.jsx`), identifying trip details, explaining destructive consequence, preventing duplicate submissions, and synchronizing `TripContext` in-memory state with last-item-on-page transition. *(Day 23 Completed)*
  - [x] **Data Isolation:** Users can only create, list, retrieve, update, or delete trips assigned strictly to their authenticated identity (`userId` from session token). Client-supplied `userId` cannot spoof ownership, bypass query filters, or mutate foreign resources. *(Day 16, Day 17, Day 18 & Day 19 Completed)*
- **Current Status:** 🟢 Completed (Full Backend Trip CRUD APIs and Full Frontend Trip CRUD Completed and verified across Days 15-23 and Day 42 E2E audit)

### 3.4 Stage 5: AI Itinerary Generation
- **Description:** Automated multi-day itinerary generation powered by an external LLM mediated through Express backend services (`server/src/services/aiService.js`).
- **Acceptance Criteria:**
  - [x] **SDK & Client Configuration:** Official Google GenAI SDK (`@google/genai` v3.6.1+) configured on the backend with singleton client caching (`server/src/config/gemini.js`), free-tier model `gemini-3.5-flash-lite` (`GEMINI_MODEL`), backend-only `GEMINI_API_KEY` credential isolation, zero-cost budget safeguards (₹0 initial budget, no paid grounding tools), and backend connectivity verification method (`verifyGeminiConnection()`). *(Day 24 Completed)*
  - [x] **Itinerary JSON Schema Design:** Predictable, typed schema (`geminiItinerarySchema` and `itineraryJsonSchema`) defining destination, editorial summary, destination travel tips, itemized budget categories (transportation, accommodation, food, activities, localTransport, miscellaneous), contiguous day sequencing, activities with 12-hour AM/PM time/duration/timeSlot/category/cost (strict 2–8 activities per day), and mutually dependent nullable WGS84 coordinates (`server/src/schemas/itinerarySchema.js`, ADR-013). *(Day 25 Completed)*
  - [x] **System Prompt Engineering & Context Injection:** `SYSTEM_INSTRUCTION` enforcing editorial travel curation, geographical clustering, 2–8 activities per day, temporal continuity, party-level budget summation, and non-factual seasonal estimation; `buildTripContext(tripData)` extracting real `Trip` model fields with duration calculation and alias resolution; `buildItineraryUserPrompt(tripContext)` injecting user context into Gemini generation requests. *(Day 26 Completed)*
  - [x] **AI Generation Service (`generateItinerary`):** Backend service securely invokes Gemini using server-side credentials, requests `responseMimeType: 'application/json'` with `responseSchema: geminiItinerarySchema`, safely parses output JSON, and normalizes errors into standardized envelopes (`GEMINI_EMPTY_RESPONSE`, `GEMINI_PARSE_ERROR`, `GEMINI_AUTH_FAILED`, `GEMINI_QUOTA_EXCEEDED`, `GEMINI_SERVICE_UNAVAILABLE`, `GEMINI_NETWORK_ERROR`) with ₹0 budget safeguards (no auto-retries, no paid tools). *(Day 26 Completed)*
  - [x] **Itinerary Generation REST API (`POST /api/trips/:id/generate-itinerary`):** Authenticated Express endpoint with `authenticateToken`, `validateTripId`, database query-level ownership enforcement via `tripService.getTripById(userId, tripId)`, anti-enumeration HTTP 404 responses for unowned/nonexistent trips, AI error normalization with mapped HTTP status codes (400, 429, 502, 503, 500), standardized response envelope `{ success: true, data: { tripId, itinerary, meta }, message }`. *(Day 27 Completed)*
  - [x] **Tier-2 Semantic Validation & Atomic Persistence:** Dedicated semantic validation module (`server/src/validators/itineraryValidator.js`) verifying trip consistency (destination, duration 1–30 days, sequential calendar dates starting on departure date), party-level budget reconciliation (all 6 categories, rounding tolerance), activity ceilings (2–8/day), and mutual coordinate nullability; atomic document persistence into MongoDB `Trip.days`, `budgetSummary`, `summary`, and `travelTips` via `tripService.saveTripItinerary`, preserving immutable trip dates and existing itineraries upon validation failure (ADR-016). *(Day 28 Completed)*
  - [x] **Embedded Subdocument Persistence:** Generated itinerary is saved directly to MongoDB within the user's trip document as embedded subdocuments (`days` and `budgetSummary`). *(Day 28 Completed)*
  - [x] **Input prompt form:** Guided modal capturing destination, travel dates, style/pace, interests, and budget tier (`CreateTripModal.jsx`). *(Completed Day 20)*
- **Current Status:** 🟢 Completed (Full AI Itinerary Generation, schema validation, persistence, and frontend workspace integration verified)

### 3.5 Stage 4: Editable Day-Wise Itinerary
- **Description:** Interactive, sequential day-by-day planner allowing granular customization.
- **Acceptance Criteria:**
  - [x] Day selector tabs view (e.g., "Day 1", "Day 2", etc.) with theme and notes *(Completed Day 29)*.
  - [x] Chronological activity list per day displaying time slot, title, description, location, estimated cost, category tag, and coordinate links *(Completed Day 29)*.
  - [x] User can add a new activity to any day (`POST /api/trips/:tripId/days/:dayId/activities`, `AddActivityModal.jsx`) *(Completed Day 33)*.
  - [x] User can edit activity details via modal (`EditActivityModal.jsx` and `PATCH /api/trips/:tripId/days/:dayId/activities/:activityId`) *(Completed Day 32)*.
  - [x] User can delete an activity from a day (`DELETE /api/trips/:tripId/days/:dayId/activities/:activityId`, `DeleteActivityModal.jsx`) *(Completed Day 33)*.
  - [x] Changes persist to MongoDB via backend API endpoints (`client/src/services/api/tripApi.js`) mutating embedded subdocuments in `Trip` with automated financial recalculation *(Completed Day 32 & Day 33)*.
- **Current Status:** 🟢 Completed Day 33 (Activity creation, editing, and deletion fully integrated with embedded subdocument persistence, query-level anti-enumeration, and dynamic budget recalculation)

### 3.6 Stage 5: Budget Calculation & Breakdown
- **Description:** Transparent financial summary tracking expenses against the trip's defined budget.
- **Acceptance Criteria:**
  - [x] Calculates total estimated expenses from all itinerary activities and stays (`server/src/services/budgetService.js`) *(Completed Day 34)*.
  - [x] Computes remaining budget with safe over-budget clamping (`Math.max(0, budget - total)`) *(Completed Day 34)*.
  - [x] Itemized categorical expense breakdown (Accommodation, Dining, Transport, Activities, Local Transport, Miscellaneous) with exact mathematical reconciliation *(Completed Day 34)*.
  - [x] Computes per-person estimated cost (`totalEstimated / travellers`) and budget utilization percentage (`(totalEstimated / budget) * 100`) with safe zero-division handling *(Completed Day 34)*.
  - [x] Visual chart representation using **Recharts** (`recharts@3.11.0`): Expense Category Donut Chart (`ExpenseDonutChart.jsx`) and Budget Comparison Bar Chart (`BudgetComparisonChart.jsx`) adhering to the editorial color palette *(Completed Day 35)*.
- **Current Status:** 🟢 Completed (Backend Budget Calculation Service, category mapping, per-person cost, budget utilization %, live frontend sync completed Day 34; Recharts visual donut and comparison charts completed Day 35)

### 3.7 Stage 4: Destination Discovery
- **Description:** Inspiration section allowing users to explore popular or trending destinations.
- **Acceptance Criteria:**
  - [x] Curated destination structure and responsive card grid (Kyoto, Swiss Alps, Bali, Manali, Varanasi, Amalfi Coast) with category insignia and narrative descriptions *(Part 1 Completed)*.
  - [x] Curated local destination photography in optimized WebP format with verified source and licensing attribution *(Part 2 Completed)*.
  - [x] Interactive category/vibe filter pills (All, Culture & Heritage, Mountain Escape, Tropical Escape, Adventure, Coastal Escape) with active state management and responsive wrapping *(Part 2 Completed)*.
  - [x] Curated destination backend data architecture with WGS84 geographic coordinates, detailed descriptions, travel vibes, search tags, budget estimates, and verified attribution *(Completed Day 36)*.
  - [x] Public RESTful Destination API endpoints (`GET /api/destinations`, `GET /api/destinations/:identifier`) with standardized response envelopes, category/search query support, and active-status filtering *(Completed Day 36)*.
  - [x] Frontend API Client service layer module (`client/src/services/api/destinationApi.js`) for integration readiness *(Completed Day 36)*.
  - [x] Frontend Destination Search and Filter API integration *(Completed Day 37)*.
  - [x] Destination Discovery cards with rich metadata, category filters, and verified photography attributions. *(Completed Day 36 & 37)*
- **Current Status:** 🟢 Completed Day 37 & Day 42 (Curated static destination dataset, public REST API, frontend API client, debounced multi-field search, synchronized category filter pills, WebP image asset resolution, and accessible loading/empty/error states fully integrated and verified).

### 3.8 Stage 5: Interactive Map Integration
- **Description:** Geographic visualization of trip destinations and daily activities using Leaflet (rendering engine) and OpenStreetMap (map data & raster tiles).
- **Acceptance Criteria:**
  - [x] Interactive map container embedded on the trip detail / itinerary view rendered using Leaflet (`LeafletMapContainer.jsx`) *(Completed Day 38)*.
  - [x] OpenStreetMap raster tile layer with mandatory attribution notice: `© OpenStreetMap contributors` *(Completed Day 38)*.
  - [x] Adherence to OpenStreetMap Tile Usage Policy: relies on standard browser header propagation (`Referer`/`Origin`), local browser caching, and prohibits bulk downloading/scraping *(Completed Day 38)*.
  - [x] Markers placed for each daily activity with latitude/longitude coordinates (`ActivityMarkers.jsx` with category-colored SVG teardrop pins) *(Completed Day 39)*.
  - [x] Clicking a marker opens an editorial popup displaying activity title, time, and address/notes with XSS sanitization *(Completed Day 39)*.
  - [x] Micro-offset coordinate disambiguation preventing occlusion for co-located stops *(Completed Day 39)*.
- **Current Status:** 🟢 Completed (Activity markers, custom SVG teardrop pins, category color badges, XSS-sanitized popups, coordinate disambiguation, bounds fitting, and responsive viewports fully integrated on TripDetailPage and verified).

### 3.9 Stage 4: Saved Trips (User Dashboard)
- **Description:** Centralized hub for managing all upcoming, past, and drafted journeys.
- **Acceptance Criteria:**
  - [x] Dashboard view displaying cards for all trips owned by the authenticated user (`DashboardPage.jsx`).
  - [x] Status categorization badges and metadata strips (dates, duration, travellers, budget).
  - [x] Quick action controls on each card: "Plan Itinerary", "Edit Details", "Delete".
  - [x] Empty state with editorial styling guiding first-time users to create their initial trip.
- **Current Status:** 🟢 Completed (Dynamic trip listing with 4 states: Loading, Error with Retry, Empty State, and Populated Trips Grid with "Plan a Journey" creation CTA, trip editing modal, and trip deletion confirmation dialog fully verified).

### 3.10 Stage 5: Context-Aware AI Travel Assistant & Chat Interface
- **Description:** Secure backend API and integrated frontend conversational interface enabling travelers to ask questions grounded in their trip itinerary, budget, and travel style.
- **Acceptance Criteria:**
  - [x] **Assistant REST API (`POST /api/trips/:tripId/assistant/messages`):** Authenticated Express endpoint with `authenticateToken`, `validateTripId`, in-memory sliding rate limiting (`assistantLimiter` max 15 req/min with HTTP 429), and standardized response envelopes *(Completed Day 40)*.
  - [x] **Multi-Tenant Anti-Enumeration Isolation:** Database query-level ownership enforcement via `tripService.getTripById(userId, tripId)` returning identical HTTP 404 `NOT_FOUND` responses for nonexistent or unowned trips *(Completed Day 40)*.
  - [x] **Context Assembly & Prompt Boundaries (`assistantContextService.js`):** Pure extractor pulling public/editorial trip metadata, traveler style preferences, itemized categorical budget summaries, and daily activity stops bounded to explicit character ceilings into `<trip_context>...</trip_context>` blocks *(Completed Day 40 & Day 42 hardened)*.
  - [x] **Prompt Engineering & Multi-Turn Contents (`assistantPrompt.js`):** Master system instruction enforcing TripMind editorial advisor persona, itinerary grounding, anti-hallucination guardrails, anti-injection defenses, and role mapping (`assistant` -> `model`) for Google Gemini *(Completed Day 40)*.
  - [x] **Request Validation (`assistantValidator.js`):** Enforces 1–1000 chars trimmed message, bounded history (max 6 messages / 3 conversation turns), and strictly whitelisted roles (`user`, `assistant`), rejecting `system` or `developer` roles *(Completed Day 40)*.
  - [x] **Provider Resilience & Timeout Cancellation (`assistantService.js`):** 30-second timeout guard linked to `AbortController` socket cancellation, returning HTTP 504 `AI_TIMEOUT`, normalized provider errors (429, 502, 503, 504), and ₹0 Free Tier budget discipline *(Completed Day 40 & Day 42 hardened)*.
  - [x] **Frontend API Client Layer (`assistantApi.js`):** Service layer module exporting `sendAssistantMessage(tripId, message, history)` with `withCredentials: true` *(Completed Day 40)*.
  - [x] **Conversational Chat Interface (`AssistantChat.jsx`):** Integrated within `TripDetailPage.jsx` and globally via `AssistantLauncher.jsx` featuring contextual initial welcome card with destination and party details, 4 curated suggested prompts (`SUGGESTED_QUESTIONS`), distinct user/assistant speech bubbles, auto-scroll, character countdown (1000 max), and conversation reset button *(Completed Day 41 & Day 42)*.
  - [x] **Zero-Dependency Markdown Parser & Formatter (`MarkdownContent.jsx` & `markdownParser.js`):** Lightweight, safe pure-JS block and inline tokenizer rendering headers (`###`), bold, italics, inline code, sanitized `http/https` links (rejecting `javascript:`/`data:` schemes), blockquotes, and ordered/unordered lists without third-party dependencies *(Completed Day 41 & Day 42 hardened)*.
  - [x] **Bounded Conversational State & Trip Scoping:** Maintains local conversation stream in React state while enforcing a strict 6-message bounded history payload transmitted to the API with newest message anti-duplication; automatically resets conversation and clears errors upon `tripId` change with zero cross-trip leak; discards stale in-flight responses if trip switched *(Completed Day 41 & Day 42 hardened)*.
  - [x] **Error Recovery & In-Place Retry:** Gracefully captures network, rate-limiting, and LLM errors in an accessible alert banner (`role="alert"`) with a "Retry" CTA that re-dispatches the failed query without duplicating user messages in the stream *(Completed Day 41)*.
  - [x] **Global AI Assistant Launcher (`AssistantLauncher.jsx`):** Floating circular launcher button mounted across every page with accessible tooltip, journey switcher dropdown, mobile drawer/desktop popover, and deep linking to the active trip workspace *(Completed Day 41/42)*.
- **Current Status:** 🟢 Completed (Backend API, frontend API client, in-trip chat interface, and global launcher fully verified across all viewports).

### 3.11 Stage 5: Shareable Itinerary Links & Read-Only Public View
- **Description:** Secure, read-only itinerary sharing with cryptographic token architecture, anti-enumeration, and data minimization.
- **Acceptance Criteria:**
  - [x] Dedicated modal in trip header to enable/disable sharing, copy link, preview, and toggle budget visibility *(Completed Day 44)*.
  - [x] Cryptographic 256-bit entropy tokens (`crypto.randomBytes(32)`), indexed via SHA-256 hash with unique partial filter expression and encrypted at rest via AES-256-GCM *(Completed Day 44)*.
  - [x] Dedicated public read-only route (`/shared/:token`) rendering destination overview, interactive Leaflet map, day-wise activities, and optional budget breakdown *(Completed Day 44)*.
  - [x] Strict data minimization (scrubbing `userId`, `__v`, internal credentials, and user emails) and uniform 404 anti-enumeration responses *(Completed Day 44)*.
  - [x] Dedicated public endpoint rate limiting (60 req/min per IP) preventing brute-force token scanning *(Completed Day 44)*.
  - [x] Client-side PDF export directly accessible from the shared itinerary view *(Completed Day 44)*.
- **Current Status:** 🟢 Completed Day 44 (Backend cryptographic service, public routes, rate limiter, ShareTripModal, and SharedTripPage fully integrated and verified across desktop and mobile).

---

## 4. Optional Extensions (Tier 2 — Post-MVP Polish)

These features provide incremental value and should only be initiated once all Tier 1 features are fully functional and tested:
1. **Weather Forecast Preview:** Display multi-day weather forecasts for upcoming trip dates using an open weather API.
2. **Packing Checklist Generator:** Suggest a personalized packing list based on trip duration, climate, and planned activities.
3. **Currency Conversion Helper:** Display estimated costs in both local destination currency and home currency.
4. **Printable / Clean View Mode:** CSS print stylesheet or clean reader mode for easy viewing on mobile or paper.

---

## 5. Future Features (Tier 3 — Strictly Out of MVP Scope)

The following capabilities are explicitly deferred to future milestones. **Agents must not implement, scaffold, or install dependencies for these features during MVP development:**

- ❌ **Persistent Multi-Channel Chatbot Infrastructure:** Persistent multi-user channels or MongoDB conversation collections (stateless bounded-turn assistant is in scope for Days 40–41).
- ❌ **Flight & Hotel Booking Integrations:** Live booking APIs (e.g., Amadeus, Skyscanner, Booking.com).
- ❌ **Collaborative Planning:** Multi-user real-time editing via WebSockets or CRDTs.

---

## 6. Scope Boundary Matrix

| Feature / Capability | MVP Scope | Out of Scope |
| :--- | :---: | :---: |
| Single-user trip creation and editing | ✅ | |
| Structured AI-generated multi-day itinerary | ✅ | |
| Context-aware AI travel assistant API | ✅ | |
| Persistent cross-session chatbot collection | | ❌ |
| Real-time multi-user collaborative editing | | ❌ |
| Leaflet + OpenStreetMap daily activity pins | ✅ | |
| Live GPS turn-by-turn navigation | | ❌ |
| Budget calculation with Recharts visualizer | ✅ | |
| Bank account / credit card sync (Plaid) | | ❌ |
| JWT authentication (Email & Password) | ✅ | |
| Social OAuth (Google/Apple) | Phase 1.5 | ❌ (MVP) |
| Curated Destination Discovery cards | ✅ | |
| Third-party hotel/flight booking checkout | | ❌ |
| Client-side credential clearing on logout | ✅ | |
| Server-side JWT blacklisting / active revocation | | ❌ |
| PDF Itinerary Export (Client-side HTML paged media) | ✅ | |
| Secure Shareable Itinerary Links (Crypto tokens & Public Read-Only) | ✅ | |
