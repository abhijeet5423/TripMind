# TripMind — Architectural & Technical Decisions (ADR)

> **Document Purpose:** Central register of Architecture Decision Records (ADRs).  
> **Status Conventions:**  
> - 🟢 **CONFIRMED:** Firmly decided, agreed upon, and foundational to the project.  
> - 🟡 **PENDING / UNDER EVALUATION:** Open questions undergoing technical evaluation or awaiting user confirmation. Never mark pending decisions as confirmed until explicitly finalized.

---

## 1. Confirmed Decisions (🟢 CONFIRMED)

### ADR-001: Client-Server Separation via REST API
- **Status:** 🟢 CONFIRMED
- **Context:** TripMind requires a responsive, dynamic user experience with distinct operational boundaries between UI rendering, business logic, authentication, and external service orchestration.
- **Decision:** Split the platform into a decoupled frontend Single Page Application (React + Vite) and a RESTful backend API (Node.js + Express organized under `server/src/`). Frontend API requests are centralized in `client/src/services/api/`.
- **Rationale:** 
  - Allows independent scaling, testing, and deployment of client and server.
  - Simplifies testing and debugging of business logic without UI interference.
  - Prepares the backend to serve future clients without architectural rewrites.
- **Consequences:** Requires explicit CORS configuration and a standardized API response envelope where `details` in error responses is always an array (`[]` when no additional details are present).

---

### ADR-002: Root Monorepo Structure (`/client` and `/server`)
- **Status:** 🟢 CONFIRMED
- **Context:** Managing multiple repositories during early MVP development introduces synchronization overhead, multi-repo PR complexity, and context switching.
- **Decision:** Maintain a single repository containing `/client` (Vite SPA) and `/server` (Express API) folders alongside root-level documentation.
- **Rationale:**
  - Facilitates synchronized development and version control across full-stack features.
  - Keeps all documentation, rules, and decision records in a single unified workspace.
- **Consequences:** Dependencies are managed independently in `client/package.json` and `server/package.json`. No shared node_modules hoisting without explicit monorepo tooling.

---

### ADR-003: Backend-Only LLM API Access (Proxy Architecture)
- **Status:** 🟢 CONFIRMED
- **Context:** TripMind uses Large Language Models to generate detailed multi-day travel itineraries. Exposing API keys in client-side JavaScript is a major security vulnerability.
- **Decision:** All interactions with AI LLM APIs must be initiated and executed exclusively by the Express backend (`server/src/services/aiService.js`). The frontend invokes the backend via `client/src/services/api/aiApi.js`.
- **Rationale:**
  - Absolute protection of LLM API keys and credentials.
  - Centralized prompt engineering and schema validation.
  - Ability to enforce rate limiting, user quotas, and caching on the server.
- **Consequences:** Backend must manage asynchronous waiting or timeouts during longer LLM generation calls.

---

### ADR-004: JWT Authentication with bcrypt Password Hashing
- **Status:** 🟢 CONFIRMED
- **Context:** User accounts and personal trip itineraries require authentication and data isolation.
- **Decision:**
  - Implement stateless authentication using JSON Web Tokens (JWT).
  - Enforce **single-point password hashing** via a Mongoose `pre('save')` hook on the `User` schema using `bcrypt` (10 salt rounds). Domain services pass raw validated passwords to `User.create()` and must never pre-hash passwords.
  - Verification during login is handled via the `user.comparePassword()` schema instance method delegating to `bcrypt.compare`.
  - MVP logout is stateless, clearing client credentials/cookies. Server-side token blacklists and active token revocation are deferred beyond MVP.
- **Scope Clarification:** This decision confirms the cryptographic identity and password hashing mechanism. The client-side token storage mechanism is confirmed in ADR-010 (HttpOnly Secure Cookie).
- **Rationale:**
  - Stateless tokens eliminate the need for server-side session stores during MVP.
  - `bcrypt` is a battle-tested industry standard for password protection.
  - Single-point hashing eliminates double-hashing regressions.
- **Consequences:** Backend middleware extracts and validates tokens on every protected route.

---

### ADR-005: MongoDB with Mongoose ODM (Independent Collections, Embedded Subdocuments & Dual Environment Support)
- **Status:** 🟢 CONFIRMED
- **Context:** Travel itineraries are hierarchical (trips contain days, days contain activities, trips aggregate budgets). Proper database modeling, backend layer boundaries, and environment flexibility (local development vs. cloud deployment) must be established.
- **Decision:**
  - **Environment Support:**
    - Support local MongoDB Community Server via `mongodb://127.0.0.1:27017/tripmind` for local development, fully accessible via MongoDB Compass without cloud dependencies.
    - Reserve MongoDB Atlas for cloud staging/production deployment. Cloud Atlas cluster configuration remains unconfigured/deferred during local development and is not marked as completed.
  - **Database Modeling:**
    - `users` and `trips` are independent MongoDB collections.
    - Each document in `trips` references its owner via `userId` (`type: mongoose.Schema.Types.ObjectId, ref: 'User'`, required and indexed).
    - Compound query index `{ userId: 1, createdAt: -1 }` optimizes user dashboard trip retrieval sorted newest first (concurrently powering `GET /api/trips` pagination and `countDocuments`).
    - Single-trip retrieval (`GET /api/trips/:id`) enforces ownership strictly at the database query level (`Trip.findOne({ _id: tripId, userId: user._id })`), rejecting malformed IDs before database queries, preventing in-memory authorization checks, and returning identical HTTP 404 responses for non-existent and unowned trips for anti-enumeration.
    - Trip partial updates (`PATCH /api/trips/:id`) enforce query-level ownership and concurrency-safe data integrity. Cross-field date updates use conditional atomic queries: departure-only updates require `returnDate: { $gt: newDepDate }`, return-only updates require `departureDate: { $lt: newRetDate }`, and concurrent opposing updates serialize via MongoDB document write locks, preventing TOCTOU date range inversions. Date conflicts on owned trips return HTTP 400 `VALIDATION_ERROR`, while unowned or nonexistent trips return identical anti-enumeration HTTP 404 responses. Nested `travelPreferences` updates are flattened into dot-notation paths to prevent replacing the entire subdocument and preserve unmentioned fields. `coverImageUrl: null` normalizes to `''` to clear images with HTTP/HTTPS URL validation. Array ceilings are strictly enforced on `interests` (max 30 items) and `travelPreferences.dietary` (max 20 items) at both validator and schema levels.
    - Trip status transitions: For the MVP, transitions among `draft`, `upcoming`, and `completed` are permitted for any valid enum member. Formal state-machine transitions and prerequisite validations (e.g. requiring generated days before `upcoming` or validating travel completion before `completed`) are explicitly deferred pending product definition.
    - Trip deletion (`DELETE /api/trips/:id`) enforces query-level ownership via `Trip.findOneAndDelete({ _id: tripId, userId: user._id })`, returning identical HTTP 404 responses for nonexistent and unowned trips. Deleting the parent `Trip` document automatically and atomically deletes all embedded `days`, `activities`, and `budgetSummary` subdocuments with zero orphaned records and no multi-collection cascades.
    - Strict validation enforces: required starting location and destination (min 2 chars), return date strictly later than departure date, non-negative budget, integer traveller count (1–50), and pace/category enums.
    - Aliases provide ergonomic property access (`startDate` -> `departureDate`, `endDate` -> `returnDate`, `totalBudget` -> `budget`, `travellers` -> `numberOfTravellers`, `itinerary` -> `days`, `budgetBreakdown` -> `budgetSummary`).
    - For the MVP, `ItineraryDay` (days array), `Activity` (activities array within each day), and `BudgetSummary` (totalEstimated, totalSpent, remaining, and categorical breakdown) are embedded subdocuments inside the `Trip` document.
    - Deleting a `Trip` document automatically and atomically deletes its embedded subdocuments in a single operation with zero multi-collection cascading operations required.
  - **Backend Layer Responsibilities:**
    - **Server Entry (`server/server.js`):** Application entry point. Loads environment variables, connects to MongoDB via Mongoose, starts HTTP listener, and manages graceful shutdown.
    - **App Configuration (`server/src/app.js`):** Configures middleware (`cors`, `helmet`, `express.json`), mounts routes, and mounts error handlers.
    - **Models (`server/src/models/`):** Define Mongoose schemas, types, validators, indexes, and interact directly with MongoDB to perform queries and persist documents.
    - **Services (`server/src/services/`):** Contain all domain and business logic, perform budget computations, orchestrate AI generation, and execute database operations exclusively through Mongoose models.
    - **Controllers (`server/src/controllers/`):** Coordinate HTTP requests and responses, parse input parameters, invoke domain services, and return standardized JSON responses. Zero business logic or direct database queries. Ownership is strictly derived from `req.user.id` (set by `authMiddleware.js`), never trusting client-supplied `userId` fields in request bodies or query parameters.
- **Rationale:**
  - Embedded subdocuments allow atomic reads and writes for trips, eliminating multi-table joins (`$lookup`) and ensuring instant retrieval of full itineraries.
  - Strict separation between models, services, and controllers preserves testability and code maintainability.
- **Consequences:** Concurrent multi-user edits on subdocuments require locking in future phases (mitigated by single-user ownership in MVP).

---

### ADR-006: Leaflet for Map Rendering & OpenStreetMap for Map Data/Tiles
- **Status:** 🟢 CONFIRMED
- **Context:** The platform requires interactive map rendering to plot daily activities and give travelers spatial awareness.
- **Decision:** Use **Leaflet** as the client-side JavaScript map rendering library, and use **OpenStreetMap (OSM)** tile servers to supply map data and raster tile imagery.
- **Policy & Usage Clarifications:**
  - **No Unlimited Free Usage Guarantee:** Public standard tile servers (`tile.openstreetmap.org`) are operated on donated community infrastructure. They do not guarantee uptime or SLA and are strictly intended for low-volume development and MVP testing.
  - **Attribution Requirement:** All map instances must display clear attribution: `© OpenStreetMap contributors`.
  - **Tile Usage Policy in Web Browsers:** Web browsers strictly prohibit JavaScript from setting custom `User-Agent` headers on tile image requests. Requests rely on standard browser header propagation (`Referer` and `Origin`), browser caching, and strict prohibition of bulk scraping.
  - **Production Scaling Path:** If traffic expands beyond MVP testing limits, TripMind will transition to a dedicated tile provider (e.g., Stadia Maps, MapTiler, Protomaps) or self-hosted tile caching.
  - **Geocoding Separation:** Geocoding (turning place names into coordinates) is decoupled from map rendering and tracked separately in [`Pending-003`](#pending-003-geocoding-strategy-for-itinerary-activities).
- **Rationale:**
  - Leaflet is lightweight, flexible, and open-source.
  - OpenStreetMap tiles provide immediate, keyless map visualization for MVP development without requiring proprietary vendor billing.
- **Consequences:** Must configure proper tile attribution and adhere to the OpenStreetMap Foundation Tile Usage Policy.

---

### ADR-007: Tailwind CSS v4 with CSS-First `@theme` Configuration
- **Status:** 🟢 CONFIRMED
- **Context:** The design requirement specifies a distinctive, premium editorial travel magazine aesthetic (Warm ivory `#F7F5EF`, Forest green `#173D35`, Terracotta `#D97757`, Muted sage `#D8DFD5`, Dark text `#242923`). TripMind uses Tailwind CSS v4.
- **Decision:** Adopt Tailwind CSS v4's modern **CSS-first configuration** model. All design tokens, custom brand colors, and font pairings are declared directly in `client/src/index.css` inside an `@theme` block rather than in a legacy `tailwind.config.js` file.
- **Rationale:**
  - Standardizes on Tailwind v4's native architecture, avoiding obsolete v3 JavaScript configuration overhead.
  - Centralizes all styling tokens in CSS variables accessible to both utility classes and custom components.
  - Zero-runtime performance with fast Vite builds.
- **Consequences:** Custom design tokens are edited directly in `client/src/index.css` under the `@theme` directive.

---

### ADR-008: Recharts for Budget Visualizations
- **Status:** 🟢 CONFIRMED
- **Context:** Travelers need to visualize categorical spending (stay, dining, transit, activities) and monitor total expenditure against their budget cap.
- **Decision:** Adopt **Recharts** for rendering categorical breakdowns and budget allocation charts.
- **Rationale:**
  - Native React integration with declarative SVG components.
  - Highly customizable to seamlessly accept custom theme colors matching the editorial palette.
  - Lightweight and responsive out of the box.
- **Consequences:** Visual customization requires configuring SVG fills and stroke properties aligned with [`UI_DESIGN_SYSTEM.md`](./UI_DESIGN_SYSTEM.md).

---

### ADR-009: Curated Local WebP Destination Photography with Verified Attribution
- **Status:** 🟢 CONFIRMED (Resolved from Pending-006)
- **Context:** The Destination Discovery showcase requires authentic, atmospheric photography for curated destinations (Kyoto, Swiss Alps, Bali, Manali, Varanasi, Amalfi Coast) that adheres to strict licensing terms, prevents external runtime dependencies/API failures, maintains fast page loads, and avoids bundle bloat.
- **Decision:**
  - Standardize on **curated local WebP assets** stored under `client/src/assets/destinations/`.
  - Maintain a strict 4:3 aspect ratio (1200x900px downsampled) and a tight performance budget (~200–300 KB per asset).
  - Source exclusively from reputable royalty-free repositories (Wikimedia Commons, Creative Commons CC BY / CC BY-SA) with verified creator attribution, original source URLs, and clear usage licenses recorded in documentation and data modules.
  - Implement graceful placeholder fallbacks in UI components for resilience.
- **Rationale:**
  - Zero external image service dependencies or API keys needed.
  - Guaranteed offline reliability and predictable production build bundling.
  - Full legal compliance with open-access creative licensing.
  - Eliminates network roundtrips to 3rd-party CDNs while maintaining high visual fidelity on Retina/4K screens.
- **Consequences:** Adding new curated destinations requires optimizing local WebP assets and documenting attribution records.

---

### ADR-010: JWT Access Token Stored in HttpOnly Secure Cookie
- **Status:** 🟢 CONFIRMED (Resolved from Pending-002)
- **Context:** TripMind uses stateless JSON Web Tokens for authentication. Choosing between client-held tokens (`localStorage` / `sessionStorage`) versus browser-managed cookies requires evaluating Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) attack surfaces, frontend operational simplicity, and deployment topology.
- **Decision:**
  - Store the JWT access token exclusively inside an **`HttpOnly`** cookie named `token`.
  - **Cookie Security Attributes:**
    - `httpOnly: true`: Blocks client-side JavaScript access (`document.cookie`), completely preventing token exfiltration via XSS or malicious third-party dependencies.
    - `secure: true` in production (enforcing HTTPS delivery); dynamically set to `false` in development (`process.env.NODE_ENV !== 'production'`) to enable local HTTP testing on `127.0.0.1` / `localhost`.
    - `sameSite`: Set to `'lax'` for local development and single-origin/subdomain deployments; set to `'none'` (paired with `secure: true`) for cross-site decoupled domains.
    - `path: '/'`: Cookie is attached to all backend API endpoints.
    - `maxAge: 15 * 60 * 1000` (15 minutes), strictly synchronized with the JWT expiration.
  - **Payload & Response Hygiene:**
    - The JWT is transmitted **strictly via the `Set-Cookie` HTTP header**. It is **never** included in the JSON response body.
    - JWT payload contains minimal claims: `sub` (User ID string) and standard timestamps (`iat`, `exp`). No passwords, hashes, emails, or personal data are embedded.
    - Signed with `HS256` using `JWT_SECRET` validated on server startup.
  - **Refresh-Token & Rotation Scope:**
    - The MVP implements short-lived 15-minute access tokens.
    - Refresh tokens, token rotation, and active server-side blacklisting are explicitly deferred to post-MVP production hardening.
  - **CSRF Mitigations & Production Requirements:**
    - Because browsers automatically attach cookies, cookie authentication is vulnerable to CSRF if unmitigated.
    - In local development and same-site topologies, `SameSite=Lax` prevents the browser from sending cookies on cross-origin mutating requests (`POST`, `PUT`, `DELETE`).
    - CORS policy explicitly restricts allowed origins to `CLIENT_URL` with `credentials: true`. Wildcard origins (`*`) are strictly prohibited.
    - **Pre-Production Requirement:** For cross-site decoupled deployments requiring `SameSite=None`, an explicit anti-CSRF mechanism (e.g., custom request header verification such as `X-Requested-With`, or Double Submit Cookie tokens) must be implemented before public production launch.
- **Rationale:**
  - Provides superior security against XSS token exfiltration compared to `localStorage`.
  - Simplifies frontend state management: client code never manually manages, persists, or injects Bearer headers.
  - Browser handles cookie lifecycle and automatic expiration naturally.
- **Consequences:**
  - Frontend Axios client must configure `withCredentials: true`.
  - Express CORS middleware must explicitly allow `config.clientUrl` with `credentials: true`.

---

### ADR-011: React Context API + Custom Hooks for Client State Management
- **Status:** 🟢 CONFIRMED (Resolved from Pending-004)
- **Context:** TripMind requires client-side state coordination for authentication session management (`AuthContext`), user trips, and pagination metadata (`TripContext`). We must decide between introducing external state libraries (Zustand, Redux Toolkit, TanStack Query) versus utilizing React's built-in Context API and custom hooks.
- **Decision:**
  - Adopt React Context API paired with dedicated custom hooks (`useAuth`, `useTrip`) for client state management during MVP.
  - Decouple cross-cutting concerns into specialized contexts:
    - `AuthContext`: Strictly manages user session verification, profile state, and HttpOnly cookie login/logout flows.
    - `TripContext`: Manages trip collections, pagination metadata, loading flags, error handling, trip creation, in-place partial update synchronization (`updateTrip`), and atomic deletion removal (`deleteTrip`).
  - Scope `TripProvider` narrowly at route boundaries (`<ProtectedRoute><TripProvider><DashboardPage /></TripProvider></ProtectedRoute>`) to prevent unnecessary context pollution across public routes.
- **Rationale:**
  - Zero external bundle weight or dependency drift.
  - React 19 native primitives provide clean async lifecycle controls and memoized actions (`useCallback`, `useRef`).
  - Separation of Concerns: Auth state remains isolated from Trip CRUD domain state.
- **Consequences:**
  - Deeply nested or highly granular subdocument updates in later stages (e.g. dragging itinerary activities) should be evaluated to avoid unnecessary parent re-renders. External state libraries (Zustand) remain an option post-MVP if state complexity expands.

---

### ADR-012: Google Gemini as AI Provider (SDK: @google/genai, Model: gemini-3.5-flash-lite, Free Tier Budget: ₹0)
- **Status:** 🟢 CONFIRMED (Resolved from Pending-001)
- **Context:** TripMind requires an external generative AI provider to generate detailed multi-day travel itineraries. The integration must operate strictly on backend Node.js services with a ₹0 initial API budget, leveraging the free tier without paid billing, search grounding, or maps grounding fees.
- **Decision:**
  - Adopt **Google Gemini** as TripMind's primary AI provider.
  - Standardize on the official **`@google/genai`** JavaScript SDK (v3.6.1+).
  - Configure the default free-tier model: **`gemini-3.5-flash-lite`** (read dynamically from `GEMINI_MODEL`, falling back to `gemini-3.5-flash-lite`).
  - Read credentials exclusively from backend environment variable **`GEMINI_API_KEY`** in `server/.env`. Credentials must never be exposed to Vite, client-side code, logs, or source code.
  - Implement a reusable client singleton (`server/src/config/gemini.js`) avoiding repeated instantiation per request.
  - Isolate provider logic within `server/src/services/aiService.js` to ensure the model or provider can be modified without altering controllers or client interfaces.
  - Implement backend-only diagnostic connectivity verification (`verifyGeminiConnection()`) without exposing public unauthenticated testing endpoints.
- **Rationale:**
  - Official `@google/genai` SDK is Google's modern, unified generative AI library for Node.js.
  - Google AI Studio Free Tier provides generous rate limits at zero financial cost (₹0 budget).
  - Lightweight `gemini-3.5-flash-lite` delivers rapid response latency suitable for responsive trip planning.
  - Reusable singleton architecture prevents memory leaks and client churn.
- **Consequences:**
  - Free-tier rate limits must be respected with proper error normalization (`GEMINI_QUOTA_EXCEEDED`).
  - Grounding tools (Google Search, Maps grounding) are disabled to prevent unexpected billing.

---

### ADR-013: AI Itinerary JSON Schema & Structured Output Contract
- **Status:** 🟢 CONFIRMED
- **Context:** TripMind uses generative AI (Google Gemini `gemini-3.5-flash-lite`) to generate complete multi-day travel itineraries. The generated data must integrate seamlessly with MongoDB `Trip` documents (embedded `days`, `activities`, and `budgetSummary`), Leaflet/OSM map rendering, Recharts budget visualizers, and the editorial design system. A strict, deterministic schema contract is required to prevent malformed responses, broken coordinates, or invalid monetary values.
- **Decision:**
  - **Schema Definition (`server/src/schemas/itinerarySchema.js`):**
    - Standardize on `geminiItinerarySchema` configured with `@google/genai`'s native `Type` enum for constrained token decoding (`config: { responseMimeType: 'application/json', responseSchema }`).
    - Standardize on `itineraryJsonSchema` (OpenAPI 3.0 / JSON Schema Draft-07) for runtime validation, documentation, and external tooling.
  - **Top-Level Envelope:** Requires `destination`, `summary`, `travelTips`, `budget`, and `days`.
  - **Currency Alignment:** The model strictly outputs all financial figures (`estimatedCost`, `budget.categories.*`, `budget.totalEstimated`) in the traveler's selected trip currency (`trip.currency`, ISO 4217 code). Schema regex `^[A-Z]{3}$` enforces format; Day 28 semantic validation explicitly verifies that the currency matches `trip.currency` and belongs to supported ISO 4217 codes. An optional `costBreakdown` string may reference local currency amounts for traveler clarity.
  - **Total Party Expenditure:** All `estimatedCost` amounts and categorical allocations represent the **total estimated cost for the entire travel party** (`numberOfTravellers`). This unifies room rates, rental vehicles, and individual entrance fees under a single coherent summation.
  - **Budget Categorization & Reconciliation:**
    - Itemizes 6 categories: `transportation`, `accommodation`, `food`, `activities`, `localTransport`, and `miscellaneous`.
    - Returns `totalEstimated`. In Day 28 persistence, the backend will verify `totalEstimated == sum(categories)` and ensure scheduled dining and activity costs reconcile with their respective categories.
  - **Spatial Coordinate Nullability & Mutual Dependency:**
    - `location.latitude` and `location.longitude` are strictly `number | null` (`nullable: true`).
    - **Both-or-Neither Invariant:** Coordinates must either both be valid WGS84 numbers within bounds (`-90 <= lat <= 90`, `-180 <= lng <= 180`), or both be `null`. Partially populated coordinates (e.g., latitude present but longitude null) are strictly rejected. Prohibits placeholder coordinates (such as `0, 0` Null Island or `999`).
  - **Temporal Contiguity & Activity Limits:**
    - Itinerary days span 1 to 30 days matching requested trip duration (`returnDate - departureDate + 1`).
    - `dayNumber` is a 1-indexed contiguous integer sequence (`1..N`).
    - Day 1 calendar date must match `trip.departureDate`, and each subsequent day must advance by exactly one calendar day.
    - Activities per day are strictly constrained to **2–8 items** across all schemas, validators, and tests (recommended 3–5) with valid `timeSlot` enums (`morning`, `afternoon`, `evening`, `night`) and 12-hour AM/PM time strings (`^(0[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$`). Activity categories strictly follow the Mongoose model (`stay`, `food`, `transit`, `activity`, `other`).
  - **Two-Tier Validation Paradigm:**
    - Tier 1: Schema-enforced typing via Gemini's constrained decoding grammar.
    - Tier 2: Backend semantic validation in Day 28 (validating day count vs duration, contiguous indexing, coordinate bounding, budget summation, and string sanitization).
  - **Non-Factual Editorial Framing:**
    - All pricing and hours are explicitly framed with a standard `disclaimer` string as AI-generated seasonal estimates, not live booking rates or guaranteed inventory.
- **Rationale:**
  - Guarantees 100% predictable, parseable JSON output from Gemini.
  - Direct 1:1 mapping into TripMind's Mongoose `Trip` subdocuments and Recharts color tokens.
  - Preserves user safety by guarding against hallucinated coordinates and fictitious prices.
- **Consequences:**
  - Day 28 generation service must pass `responseSchema: geminiItinerarySchema` to `generateContent`.
  - The persistence layer must map `localTransport` and `miscellaneous` cleanly into `Trip.budgetSummary`.

---

### ADR-014: AI Service Architecture, System Prompt Engineering & Context Injection
- **Status:** 🟢 CONFIRMED
- **Context:** Following Gemini client configuration (ADR-012) and itinerary schema specification (ADR-013), TripMind requires a backend AI service (`server/src/services/aiService.js`) to generate multi-day travel itineraries from user trip data. The service must bridge user inputs to Google Gemini (`gemini-3.5-flash-lite`) via prompt engineering and context injection while enforcing security, ₹0 budget free-tier safeguards, error normalization, and predictable response contracts.
- **Decision:**
  - **Service Architecture & Exported Functions:**
    - `generateItinerary(tripData, options)`: Main generation orchestration method.
    - `buildTripContext(tripData)`: Extracts, cleanses, validates, and normalizes trip data into a structured context object.
    - `buildItineraryUserPrompt(tripContext)`: Constructs the structured user prompt injecting traveler context and explicit generation rules.
    - `calculateTripDuration(depStr, retStr)`: Utility computing inclusive calendar duration in days (1–30 days); strictly rejects date ranges exceeding 30 days or inverted date spans.
    - `formatDateToISO(dateValue)`: Normalizes Dates or date strings to `YYYY-MM-DD`.
    - Preserves existing Day 24 diagnostic methods (`verifyGeminiConnection`, `formatGeminiError`, `CONNECTION_TEST_PROMPT`).
  - **System Prompt Engineering (`SYSTEM_INSTRUCTION`):**
    - Establishes the model's persona as TripMind's expert travel curator and itinerary architect with editorial refinement.
    - Enforces raw structured JSON conforming to `geminiItinerarySchema` without markdown code fences or conversational filler.
    - Mandates geographical proximity grouping to minimize transit backtracking.
    - Enforces strict **2 to 8 activities per day** matching requested pace: relaxed (2–3), moderate (3–5), fast-paced (5–8).
    - Requires temporal continuity: Day 1 date = `departureDate`, subsequent days increment by 1 calendar day, 12-hour AM/PM time format (`HH:MM AM/PM`), and `timeSlot` enums (`morning`, `afternoon`, `evening`, `night`).
    - Enforces mutual coordinate nullability: known landmarks require accurate WGS84 floats; generic/uncertain stops require both latitude and longitude set to `null`.
    - Mandates party-level budget summation: all amounts in requested trip currency representing the total expenditure for the entire party (`numberOfTravellers`), reconciling scheduled food and activity expenses against their respective category allocations.
    - Prohibits factual hallucinations: financial figures and opening hours are framed as seasonal estimates, not live booking quotes.
  - **Context Injection (`buildTripContext`):**
    - Strictly inspects real Mongoose `Trip` model fields: `destination`, `startingLocation`, `departureDate`, `returnDate`, `numberOfTravellers`, `budget`, `currency`, `interests`, and `travelPreferences` (`pace`, `accommodationType`, `transportation`, `dietary`, `notes`), plus optional `title`.
    - Accepts both Mongoose documents (via `.toObject()`) and plain objects, resolving schema aliases (`startDate`, `endDate`, `totalBudget`, `travellers`).
    - Enforces boundary rules: `interests` (max 30 items), `travelPreferences.dietary` (max 20 items), duration (strictly 1 to 30 days; rejects inputs exceeding 30 days or inconsistent durationDays). Leaves dates intact.
  - **Gemini Request Configuration:**
    - Uses `@google/genai` client singleton: `client.models.generateContent({ model, contents: userPrompt, config: { responseMimeType: 'application/json', responseSchema: geminiItinerarySchema, systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 } })`.
    - Supports optional client dependency injection (`options.client`) for deterministic unit testing without live network calls.
  - **Error Normalization & Bounded Retries:**
    - Normalizes empty responses to `GEMINI_EMPTY_RESPONSE` and unparseable JSON to `GEMINI_PARSE_ERROR`.
    - Normalizes provider error statuses (400, 401/403, 404, 429, 503, network errors) into standardized error codes (`GEMINI_AUTH_FAILED`, `GEMINI_QUOTA_EXCEEDED`, `GEMINI_SERVICE_UNAVAILABLE`, `GEMINI_NETWORK_ERROR`, `GEMINI_CONFIG_ERROR`).
    - **No Automatic Retries:** Automatic retries on rate limits or service errors are explicitly prohibited to prevent rapid exhaustion of the traveler's free-tier quota (₹0 initial budget). Errors are returned to the caller for user-controlled retry.
  - **Scope Discipline:**
    - Zero controllers, routes, or frontend integrations created in Day 26.
    - MongoDB document persistence is deferred to Day 28.
- **Rationale:**
  - Provides a single, clean service interface for travel itinerary generation.
  - Eliminates prompt duplication and guarantees strict conformance to the Day 25 schema.
  - Protects user quota and backend credentials while delivering actionable feedback on errors.
- **Consequences:**
  - Day 27 prompt validation and Day 28 controllers/routes can consume `generateItinerary` directly.

---

### ADR-015: AI Itinerary Generation Endpoint Architecture & Persistence Boundary
- **Status:** 🟢 CONFIRMED
- **Context:**
  With the AI generation service completed in Day 26 (`server/src/services/aiService.js`), TripMind requires an authenticated REST endpoint allowing travelers to generate multi-day itineraries for their trips. Architectural decisions were required regarding endpoint design, authentication/authorization enforcement, HTTP status mapping for AI errors, and the persistence boundary between generation and saving.
- **Decision:**
  1. **Endpoint & Routing:** Implement `POST /api/trips/:id/generate-itinerary` mounted on the existing `trip.routes.js` router and handled by `generateTripItinerary` in `tripController.js`. Avoid introducing separate premature route files (`aiRoutes.js`) to keep single-trip operations cohesive and backwards compatible.
  2. **Strict Authentication & Anti-Enumeration Ownership:**
     - Require `authenticateToken` middleware (verifies HttpOnly JWT cookie; attaches verified identity to `req.user.id`).
     - Validate ObjectId syntax with `validateTripId` (returns 400 `INVALID_ID`).
     - Retrieve trip via `tripService.getTripById(userId, tripId)` enforcing database query-level ownership (`_id: tripId, userId: user._id`).
     - Unowned or non-existent trips return identical HTTP 404 `NOT_FOUND` responses with `"Trip not found"` and `details: []`, completely preventing user resource enumeration attacks.
  3. **Zero Gemini Call Leakage:**
     - External AI calls to Gemini are dispatched ONLY after authentication, ID validation, ownership verification, and trip context checks pass. Unauthorized, malformed, or nonexistent requests make 0 Gemini calls.
  4. **AI Error Normalization to HTTP Status Mapping:**
     - `INVALID_TRIP_CONTEXT` -> HTTP 400 Bad Request
     - `GEMINI_QUOTA_EXCEEDED` -> HTTP 429 Too Many Requests
     - `GEMINI_SERVICE_UNAVAILABLE` -> HTTP 503 Service Unavailable
     - `GEMINI_AUTH_FAILED`, `GEMINI_NETWORK_ERROR`, `GEMINI_EMPTY_RESPONSE`, `GEMINI_PARSE_ERROR` -> HTTP 502 Bad Gateway
     - `GEMINI_CONFIG_ERROR` / default -> HTTP 500 Internal Server Error
     - All error responses strictly conform to the standard envelope `{ success: false, error: { code, message, details: [] } }`.
  5. **Persistence Boundary (Day 27 vs Day 28):**
     - Day 27 generates and returns the structured itinerary in memory (`{ success: true, data: { tripId, itinerary, meta }, message: "Itinerary generated successfully." }`).
     - Day 27 explicitly does NOT persist the generated itinerary to MongoDB (`trip.days` remains `[]`).
     - Database persistence paired with Tier-2 semantic validation is strictly deferred to Day 28.
- **Rationale:**
  - Preserves clean separation of concerns: generation preview is verified before persistence.
  - Aligns with RESTful resource-oriented design (`/api/trips/:id/...`).
  - Protects external API quotas and prevents unauthorized token depletion.
- **Consequences:**
  - Frontend or consumers in Day 27 receive the full itinerary data without database side effects.
  - Day 28 will implement semantic validation and database update/saving.

---

### ADR-016: Two-Tier Itinerary Validation & Atomic Document Persistence Strategy
- **Status:** 🟢 CONFIRMED
- **Context:**
  With the itinerary generation API endpoint established in Day 27 (`POST /api/trips/:id/generate-itinerary`), TripMind required a robust validation and persistence strategy. AI models can produce syntactically compliant JSON that contradicts real user constraints (e.g. mismatched destinations, dates exceeding requested duration, incorrect currency, or mathematical discrepancies). Furthermore, saving the itinerary must preserve original trip metadata, enforce query-level ownership, prevent partial writes, and establish a clear regeneration policy.
- **Decision:**
  1. **Two-Tier Validation Architecture:**
     - **Tier 1 (Structural Schema Validation):** Handled via `validateItineraryStructure()` (`server/src/schemas/itinerarySchema.js`), validating structural types, required fields, and 12-hour AM/PM formats.
     - **Tier 2 (Domain Semantic Validation):** Handled via `validateItinerarySemantic()` in a dedicated validator module (`server/src/validators/itineraryValidator.js`). Validates:
       - *Destination Matching (`areDestinationsConsistent`):* Segment- and token-aware deterministic match. Strictly rejects lexical substring collisions ("York" vs "New York", "Rome" vs "Jerome", "Mali" vs "Somalia") and regional contradictions ("Paris, France" vs "Paris, Texas"). Supports legitimate omitted qualifiers ("Kyoto" vs "Kyoto, Japan", "Paris, France" vs "Paris", "New York" vs "New York, USA") and administrative suffixes ("New York City" vs "New York"). Zero external geocoding API needed for MVP, preserving the ₹0 budget invariant.
       - *Duration & Day Count Consistency:* Calendar day duration strictly derived from `trip.departureDate` and `trip.returnDate` (1–30 days); itinerary day count must match duration exactly.
       - *Contiguous Day Numbering & Dates:* Days must start at 1, be strictly contiguous (`1..N`) with zero gaps or duplicates, Day 1 must match `departureDate`, subsequent dates advance sequentially by 1 calendar day, and dates must not extend beyond `returnDate`.
       - *Currency Consistency:* Strict uppercase equality between `itinerary.budget.currency` and `trip.currency`.
       - *Budget Reconciliation:* All monetary values must be finite, non-negative numbers. `totalEstimated` must equal the sum of all 6 budget categories within a 1.0 unit tolerance. Scheduled dining costs cannot exceed allocated food category, and scheduled activity admissions cannot exceed allocated activities category. Activity `costBreakdown` is strictly an editorial string description and is never added to numerical sums (zero double-counting). Multi-category activities (`category: 'other'`) are bounded only by `totalEstimated` and never compared against individual category allocations, preventing false rejections.
       - *Activity Ceilings & Mutual Nullability:* 2–8 activities per day, valid category and timeSlot enums, and WGS84 coordinates that are either both valid finite numbers or both null.
  2. **Safe Atomic Document Persistence (`tripService.saveTripItinerary`):**
     - Executes single atomic `Trip.findOneAndUpdate({ _id: tripId, userId: user._id }, { $set: { days, budgetSummary, summary, travelTips } }, { returnDocument: 'after', runValidators: true })`.
     - Maps AI activity objects (`name` -> `title`, `duration`, `costBreakdown`, `locationName`, `location`, `latitude`, `longitude`, `estimatedCost`, `category`) and items all 6 budget categories into `budgetSummary`.
     - Original trip fields (`destination`, `startingLocation`, `departureDate`, `returnDate`, `budget`, `currency`, `numberOfTravellers`, `title`, `interests`, `travelPreferences`) remain strictly immutable and unchanged during itinerary persistence.
  3. **Regeneration Policy:**
     - Regeneration is fully supported: an authenticated owner may request generation again for a trip that already has saved days.
     - Existing itineraries in MongoDB are preserved completely if regeneration fails or if the AI output fails validation.
     - The database update occurs only after full validation passes with zero errors.
  4. **Fallback & Error Handling (Zero-Cost Discipline):**
     - Zero automatic Gemini retries: invalid output returns HTTP 422 `ITINERARY_VALIDATION_FAILED` with descriptive error details.
     - Database persistence failures return HTTP 500 `PERSISTENCE_FAILED`.
- **Rationale:**
  - Prevents corrupt, hallucinated, or contradictory travel data from reaching MongoDB.
  - Guarantees zero credential or quota leakage while protecting existing user data.
  - Aligns with clean architectural layering: controller handles HTTP, validator handles business rules, service handles domain DB persistence.
- **Consequences:**
  - Consumers receive reliable, fully validated itineraries backed by atomic MongoDB persistence.
  - Day 29 and frontend views can reliably display persisted days and budget summaries without edge-case crashes.

---

## 2. Pending Decisions (🟡 UNDER EVALUATION)

The following architectural and technical choices are open for evaluation during future implementation planning. **Do not mark pending decisions as confirmed.**

### Pending-001: Specific LLM Provider & Model Selection
- **Status:** 🟢 RESOLVED (See ADR-012)
- **Options Evaluated:**
  - *Option A: Google Gemini API (gemini-3.5-flash-lite via @google/genai)* — Generous free tier (₹0 budget), low latency, official Google SDK.
  - *Option B: OpenAI API (e.g., GPT-4o-mini)* — Requires paid billing credits.
  - *Option C: Anthropic Claude API (e.g., Claude 3.5 Haiku / Sonnet)* — Requires paid billing credits.
- **Resolution:** Adopted Option A (Google Gemini API using official `@google/genai` SDK and free-tier model `gemini-3.5-flash-lite`). Confirmed as **ADR-012**.

---

### Pending-002: Client Authentication Token Storage Strategy
- **Status:** 🟢 RESOLVED (See ADR-010)
- **Options Evaluated:**
  - *Option A: HttpOnly, Secure Cookies* — High XSS resistance, browser-managed lifecycle, mitigated CSRF via `SameSite` and custom headers.
  - *Option B: Client-Held Bearer Tokens (`localStorage` or `sessionStorage`)* — Immune to CSRF, but highly vulnerable to credential exfiltration via any XSS flaw or supply-chain script injection.
  - *Option C: In-Memory Storage + HttpOnly Refresh Token* — Strong security but introduces high client state complexity and token renewal races for early MVP.
- **Resolution:** Adopted Option A (JWT access token in an HttpOnly cookie with aligned expiration, strict CORS origin pairing, and `SameSite` protection). Confirmed as **ADR-010**.

---

### Pending-003: Geocoding Strategy for Itinerary Activities
- **Status:** 🟡 UNDER EVALUATION
- **Context:** Leaflet and OpenStreetMap render tiles and display markers, but converting text addresses or attraction names into latitude/longitude coordinates requires a geocoding mechanism.
- **Options Under Consideration:**
  - *Option A: LLM-Supplied Coordinates* — Instruct the LLM prompt to return approximate latitude and longitude coordinates in its structured JSON output. Avoids external network calls; accuracy varies.
  - *Option B: Nominatim (OpenStreetMap Geocoder)* — Open-source geocoding API. Free, but has a strict policy limit of 1 request per second, mandatory custom User-Agent, and requires caching.
  - *Option C: Third-Party Geocoding API (e.g., LocationIQ, OpenCage, Geoapify)* — High precision, generous free tiers, requires API key configuration in `server/.env`.
- **Next Step:** Benchmark LLM coordinate accuracy versus a cached backend Nominatim/third-party lookup service during map feature planning.

---

### Pending-004: Client-Side State Management Paradigm
- **Status:** 🟢 RESOLVED (See ADR-011)
- **Options Under Consideration:**
  - *Option A: React Context API + Custom Hooks* — Zero additional dependencies, sufficient for MVP scope (Auth state + active Trip state).
  - *Option B: Zustand* — Lightweight, minimal boilerplate, eliminates unnecessary re-renders in complex itinerary editing.
  - *Option C: TanStack Query (React Query)* — Powerful server-state caching, automatic refetching, and mutation management.
- **Resolution:** Adopted Option A (Dedicated React Contexts `AuthContext` and `TripContext` paired with custom hooks). Confirmed as **ADR-011**.

---

### Pending-005: Leaflet React Integration Approach
- **Status:** 🟡 UNDER EVALUATION
- **Options Under Consideration:**
  - *Option A: `react-leaflet`* — Declarative React wrapper around Leaflet elements.
  - *Option B: Vanilla Leaflet with React `useRef` & `useEffect`* — Complete control over lifecycle, avoids version mismatch issues with React 19/Vite.
- **Next Step:** Run a lightweight spike during map feature development to assess Vite compatibility.

---

### Pending-006: Destination Imagery Strategy
- **Status:** 🟢 RESOLVED (See ADR-009)
- **Options Evaluated:**
  - *Option A: Curated static/royalty-free URL presets or local assets* — Zero cost, reliable, zero backend storage needed for MVP discovery cards.
  - *Option B: Backend-proxied Unsplash API* — Dynamic photography search per destination; requires Unsplash API key.
  - *Option C: Cloudinary / S3 user photo uploads* — Deferred to post-MVP.
- **Resolution:** Adopted Option A with local asset curation (verified royalty-free WebP presets with exact creator attribution and licensing stored under `client/src/assets/destinations/`). Confirmed as **ADR-009**.

---

### Pending-007: AI Rate Limiting & Quota Management
- **Status:** 🟡 UNDER EVALUATION
- **Options Under Consideration:**
  - *Option A: Express-rate-limit middleware* — Simple IP/user-based in-memory rate limiting (e.g., max 5 AI generations per user per hour).
  - *Option B: User document quota counter in MongoDB* — Enforces hard lifetime or daily generation quotas per account.
- **Recommendation:** Combine `express-rate-limit` with user-level generation counter in MongoDB.
