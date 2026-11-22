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
- **Status:** 🟢 CONFIRMED (Implemented Day 35)
- **Context:** Travelers need to visualize categorical spending (stay, dining, transit, activities, local transit, miscellaneous) and monitor total expenditure against their budget cap.
- **Decision:** Adopt **Recharts** (`recharts@3.11.0`) for rendering categorical breakdowns and budget allocation charts.
- **Architecture & Implementation (`client/src/components/budget/`):**
  - **Visualization A (`ExpenseDonutChart.jsx`):** Responsive donut chart displaying the 6 canonical categories (`CANONICAL_BUDGET_CATEGORIES`). Strictly omits the legacy `other` alias to prevent duplicate slices or double-counting. Features centered total summary, responsive legend, and custom tooltips with currency formatting.
  - **Visualization B (`BudgetComparisonChart.jsx`):** Responsive horizontal comparison bar chart comparing Target Budget, Total Estimated Expenses, and Remaining Buffer based strictly on backend-persisted figures. Over-budget trips are highlighted with Burnt Crimson (`#B33A3A`) while remaining buffer is strictly clamped to 0 (never negative).
  - **Pure Transformers (`constants.js`):** Decoupled data transformation functions (`transformCategoryChartData`, `transformComparisonChartData`) allow comprehensive unit testing without DOM overhead.
- **Rationale:**
  - Native React integration with declarative SVG components and React 19 compatibility.
  - Highly customizable to seamlessly accept custom theme colors matching the editorial palette.
  - Lightweight, responsive out of the box (`ResponsiveContainer`), and accessible (ARIA regions and `sr-only` summaries).
- **Consequences:** Visual customization requires configuring SVG fills and stroke properties aligned with [`UI_DESIGN_SYSTEM.md`](./UI_DESIGN_SYSTEM.md). Frontend components consume authoritative server metrics rather than computing their own math.

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

### ADR-017: Subdocument Identification, Partial Mutation, Anti-Enumeration Ownership, and Dynamic Budget Recalculation for Activity Updates
- **Status:** 🟢 CONFIRMED
- **Context:** Week 5, Day 32 requires allowing authenticated travelers to edit individual activities embedded within an itinerary day. Because activities are subdocuments embedded within `days[].activities[]` in MongoDB rather than standalone documents in their own collection, an architectural strategy was required for identifying target activities, enforcing ownership securely without leaking resource existence to attackers, partially updating fields without clobbering untouched properties, and keeping financial budget totals synchronized.
- **Decision:**
  1. **Subdocument Identification:** Both `itineraryDaySchema` and `activitySchema` in `Trip.js` have `{ _id: true }` enabled. Mongoose and MongoDB assign stable, unique 24-character hexadecimal ObjectIds to every day and activity subdocument. Subdocuments are addressed directly using Mongoose subdocument methods: `trip.days.id(dayId)` and `day.activities.id(activityId)` under route `PATCH /api/trips/:tripId/days/:dayId/activities/:activityId`.
  2. **Anti-Enumeration Ownership Model:** Ownership is verified strictly at the query level: `Trip.findOne({ _id: tripId, userId: user._id })`. An attempt to modify or probe another user's trip yields `null` and returns HTTP 404 `NOT_FOUND` (identical to non-existent trips), preventing cross-user ID scanning or timing attacks.
  3. **Strict Whitelisted Partial Updates:** Only explicitly submitted fields are modified. Subdocument mutation directly assigns only provided values, leaving unmentioned fields (`description`, `category`, `time`, `location`, etc.) 100% intact. Protected fields (`_id`, `userId`, `tripId`, `dayId`, `activityId`, `createdAt`, `updatedAt`, `__v`) and arbitrary unrecognized keys are rejected with HTTP 400 `VALIDATION_ERROR`.
  4. **Dynamic Budget Summary Recalculation:** If an activity's `estimatedCost` or `category` changes, `tripService.updateTripActivity` iterates across all activities across all days in memory before `trip.save()`, re-tallying `trip.budgetSummary.totalEstimated`, `trip.budgetSummary.remaining`, and all 6 categorical totals (`accommodation`, `food`, `transportation`, `activities`, `localTransport`, `miscellaneous`).
  5. **Standardized Response Envelope:** The endpoint returns `{ success: true, data: { activity, trip }, message: "Activity updated successfully" }`, allowing the client to update both the activity card and budget breakdown modules in state immediately.
- **Rationale:**
  - Preserves the embedded document architecture established in MVP scope without introducing multi-collection joins or normalization overhead.
  - Guarantees zero data loss during partial edits.
  - Prevents financial state drift between activity cards and Recharts budget breakdown visualizations.
  - Zero leakage of resource existence to unauthorized callers.
- **Consequences:**
  - Clients must supply valid 24-character hexadecimal ObjectIds for `:tripId`, `:dayId`, and `:activityId`.
  - Adding or deleting activities (Day 33) will follow this established subdocument mutation pattern.

---

### ADR-018: Itinerary Activity Creation & Deletion via Subdocument Array Mutation and Centralized Financial Recalculation
- **Status:** 🟢 CONFIRMED
- **Context:** Following Day 32 activity editing, Day 33 requires allowing authenticated travelers to dynamically add new activities to specific itinerary days and delete unwanted activities, persisting changes to MongoDB and immediately updating the UI and budget metrics without full page reloads.
- **Decision:**
  1. **Embedded Subdocument Array Operations:** Preserve the embedded document architecture (`Trip.days[].activities[]`). Use `day.activities.push(...)` for creation (generating Mongoose `_id` ObjectIds) and `day.activities.pull({ _id: activity._id })` for atomic removal by unique identifier. Do NOT introduce an external `Activity` collection.
  2. **Dedicated RESTful Endpoints:**
     - Add Activity: `POST /api/trips/:tripId/days/:dayId/activities` (returns HTTP 201 Created with `{ success: true, data: { activity, trip }, message }`).
     - Remove Activity: `DELETE /api/trips/:tripId/days/:dayId/activities/:activityId` (returns HTTP 200 OK with `{ success: true, data: { trip }, message }`).
  3. **Ownership & Anti-Enumeration:** Enforce authorization at the query level `Trip.findOne({ _id: tripId, userId: user._id })`, returning HTTP 404 `NOT_FOUND` if the trip does not exist or belongs to another user.
  4. **Strict Payload Sanitization:** `validateAddActivity` requires `title`/`name`, validates enums (`category`, `timeSlot`), enforces non-negative cost and coordinate mutual nullability, and rejects empty payloads, client-injected protected fields (`_id`, `userId`, etc.), and unrecognized keys.
  5. **Centralized Financial Recalculation:** Centralize budget calculation into `recalculateTripBudgetSummary(trip)` in `tripService.js`. Recompute `totalEstimated`, `remaining` (`Math.max(0, budget - total)`), and all 6 categories across all days whenever activities are added, updated, or removed. Safely handle zero-activity and over-budget states.
  6. **Accessible Frontend Dialogs:** Implement `AddActivityModal.jsx` with category pills and loading locks, and `DeleteActivityModal.jsx` with `role="alertdialog"` confirmation semantics to prevent accidental deletions.
- **Rationale:**
  - Guarantees zero orphaned records and zero cross-collection cascades.
  - Sibling activities on the same day and activities on other days remain 100% untouched.
  - Centralizing financial calculation eliminates divergence between add, update, and remove paths.
- **Consequences:**
  - Removing an activity safely reallocates remaining budget in real time.
  - Future budget charts (Day 35) consume a consistent, authoritative server budget summary.

---

### ADR-019: Centralized Backend Budget Calculation Service with Pure Functional Architecture
- **Status:** 🟢 CONFIRMED
- **Context:** Budget figures must remain authoritative, consistent, and mathematically sound across all activity lifecycle operations (AI generation, manual additions, edits, and deletions) without client-side calculation drift or duplicate logic across services.
- **Decision:**
  1. **Dedicated Service Module (`server/src/services/budgetService.js`):** Extract and centralize all financial computation into pure, stateless functions (`calculateTripBudget`, `recalculateTripBudgetSummary`, `roundCurrency`, `normalizeActivityCategory`).
  2. **Authoritative Backend Calculations:**
     - `totalEstimated`: sum of all finite positive `estimatedCost` values across all itinerary days.
     - `remaining`: `Math.max(0, budget - totalEstimated)` (strictly non-negative).
     - `perPersonCost`: `totalEstimated / max(1, numberOfTravellers)` (safe from zero-division, `Infinity`, `NaN`).
     - `budgetUtilization`: `(totalEstimated / budget) * 100` when `budget > 0`, otherwise `0%`.
  3. **Precision & Reconciliation:** Standardize on 2-decimal financial rounding (`roundCurrency`) with exact reconciliation ensuring $\sum \text{categories} \equiv \text{totalEstimated}$.
  4. **Category Normalization:** Map activity categories (`stay`, `food`, `transit`, `activity`, `localtransport`, `other`) to canonical budget breakdown categories (`accommodation`, `food`, `transportation`, `activities`, `localTransport`, `miscellaneous`).
  5. **Schema Integration:** Extended `budgetSummarySchema` in `Trip.js` with `perPersonCost` and `budgetUtilization`, persisted upon every itinerary mutation.
- **Rationale:**
  - Decoupling pure mathematical calculation from Mongoose queries allows extensive unit testing across complex edge cases without database overhead.
  - Guarantees 100% synchronization between backend database storage and frontend presentation.
  - Prepares the data layer for Recharts visual charts in Day 35.
- **Consequences:**
  - Frontend components (`BudgetBreakdown.jsx`) consume authoritative server metrics rather than computing their own math.

---

### ADR-020: Curated Static Destination Data Architecture & Public Discovery API
- **Status:** 🟢 CONFIRMED (Implemented Day 36)
- **Context:** TripMind's Destination Discovery feature requires an authoritative dataset of inspiring travel destinations featuring rich editorial narrative descriptions, verified open-access creator attributions, category/vibe classifications, and accurate WGS84 geographic coordinates for future Leaflet map plotting (Days 38–39). We evaluated whether storing destinations in a MongoDB collection versus serving curated static data is more appropriate for the MVP.
- **Decision:**
  1. **Curated Static Dataset (`server/src/data/destinations.js`):** Maintain destinations as an authoritative, centralized in-memory JavaScript dataset rather than an active MongoDB collection for the MVP.
  2. **Domain Service Encapsulation (`server/src/services/destinationService.js`):** Encapsulate all destination queries behind pure service functions (`getAllDestinations`, `getDestinationBySlugOrId`, `isValidDestination`), ensuring complete immutability (deep-cloning data before returning) and providing built-in active-status filtering (`activeOnly: true` by default).
  3. **Public RESTful Endpoints (`server/src/routes/destination.routes.js` & `server/src/controllers/destinationController.js`):**
     - `GET /api/destinations`: Returns all active curated destinations conforming to the standardized response envelope `{ success: true, data: { destinations, total }, message }`. Supports query parameters for category filtering (`?category=...`), search keywords (`?search=...`), and active-status overrides (`?activeOnly=...`).
     - `GET /api/destinations/:identifier`: Returns a single destination matching by URL-safe slug or stable ID (case-insensitive) with HTTP 404 anti-enumeration `{ success: false, error: { code: 'NOT_FOUND', message: 'Destination not found', details: [] } }` for unknown destinations.
  4. **Public Accessibility & Security Hygiene:** Public discovery endpoints require zero authentication headers or cookies, eliminating unnecessary login barriers for landing page visitors while exposing zero secrets or environment variables.
  5. **Frontend API Client Integration (`client/src/services/api/destinationApi.js`):** Encapsulate client HTTP calls through dedicated Axios service methods (`getDestinations`, `getDestination`) preserving the backend response envelope and preparing for Day 37 UI integration.
- **Rationale:**
  - **Zero Database Complexity:** Curated destinations are editorial assets (not user-generated content). Static storage eliminates MongoDB collection indexes, schema overhead, seed scripts, and migration complexity during MVP development.
  - **Ultra-Fast Performance:** In-memory retrieval achieves 0ms query latency with zero database connection pool contention or I/O bottleneck.
  - **Guaranteed Data Integrity:** Coordinates (WGS84) and creator attribution records are strictly verified and cannot be accidentally mutated, dropped, or corrupted by runtime operations.
  - **Clean Future Transition:** When transitioning to dynamic CMS content in Phase 2, the exact same controller, route, and client API contracts can query a Mongoose `Destination` model without modifying downstream consumers.
- **Consequences:**
  - Adding or modifying curated destinations during MVP is managed directly in `server/src/data/destinations.js`.
  - Day 37 search and filters can execute fast in-memory filtering via the service layer.

---

### ADR-021: Debounced Search, Synchronized Category Filtering, and Bundled WebP Asset Resolution for Destination Discovery
- **Status:** 🟢 CONFIRMED (Implemented Day 37)
- **Context:** On Day 36, public backend endpoints and the Axios client module were implemented. On Day 37, the frontend `DestinationDiscovery.jsx` needed to transition from the hardcoded `destinations.js` data file to dynamic backend API retrieval. Key architectural considerations:
  1. Vite asset bundling creates hashed asset URLs (e.g., `kyoto-japan-BicYHV9m.webp`), whereas the backend returns raw paths (`/assets/destinations/kyoto-japan.webp`). Blindly rendering backend image strings causes 404 broken image links in production.
  2. Rapid typing in the search bar or rapid clicking on category filter pills can fire concurrent requests that resolve out of order, leading to race conditions where older query results clobber newer results.
  3. Search must be responsive without overloading the API on every single keystroke.
  4. Non-matching queries and network errors must display graceful, editorial feedback with recovery CTAs.
- **Decision:**
  1. **Bundled WebP Asset Resolution via Image Registry (`resolveDestinationImage`):** Implement a dedicated client-side asset resolver in `client/src/utils/destinationImages.js` that maps stable destination identifiers and slugs to Vite-bundled WebP imports (`import kyotoImg from '../assets/destinations/kyoto-japan.webp'`). If an identifier is found in the registry, it returns the bundled hash URL. If not, it falls back to `getDestinationPhoto` or the raw string. All metadata, titles, descriptions, coordinates, and creator attributions remain 100% API-driven.
  2. **Multi-Field Keyword Search:** The backend service searches across `name`, `country`, `region`, `tags`, `travelVibes`, and `highlights` (case-insensitive substring inclusion).
  3. **Debounced Search Input (300ms):** Debounce `searchQuery` state with a 300ms `setTimeout` before updating `debouncedSearch`, preventing intermediate API spam while typing.
  4. **Race Condition Prevention & Request Cancellation:** Maintain a `latestRequestId` ref and instantiate an `AbortController` in `useEffect`. If a newer fetch fires before a previous request completes, the controller aborts the previous request via `options.signal` passed to `destinationApi.getDestinations(params, { signal })`, and `requestId !== latestRequestId.current` guards silently drop stale responses.
  5. **Stateful Feedback UI:**
     - 6-card pulsing skeleton loader during initial and transition fetches.
     - Editorial empty state with `Compass` icon, descriptive search feedback, and contextual "Clear search query", "View all categories", or "Reset all filters" buttons.
     - Accessible error banner with a "Try Again" retry action.
  6. **Zero Staging / Zero Git Commits:** All changes remain in the local working tree without `git add` or `git commit`.
- **Rationale:**
  - Preserves 100% asset fidelity and verified Wikimedia Commons attributions without broken links.
  - Eliminates asynchronous race conditions and UI flicker during fast user input.
  - Keeps the codebase clean, modular, and adhering strictly to TripMind's editorial design system.
- **Consequences:**
  - `destinationApi.getDestinations` accepts an optional `options` parameter supporting `signal`.
  - Frontend components import `resolveDestinationImage` to bind API destination objects with bundled images.

---

### ADR-022: Vanilla Leaflet with React 19 Lifecycle and Container Resilience for Interactive Maps
- **Status:** 🟢 CONFIRMED (Implemented Day 38)
- **Context:** TripMind requires interactive geographic mapping on trip and itinerary views. We evaluated integrating Leaflet through declarative React wrappers (`react-leaflet`) versus directly utilizing Vanilla Leaflet (`leaflet@^1.9.4`) managed via React 19 lifecycle hooks (`useRef` and `useEffect`).
- **Decision:**
  1. **Adopt Vanilla Leaflet (`leaflet@^1.9.4`):** Avoid `react-leaflet` to eliminate React 19 peer-dependency collisions and retain complete authority over Leaflet's lifecycle and DOM elements.
  2. **Dedicated Component Encapsulation (`LeafletMapContainer.jsx`):** Encapsulate map instantiation inside a reusable, accessible component (`role="region"`). Reference the container via `containerRef` and track the active instance via `mapInstanceRef`.
  3. **Duplicate Initialization Defense:** Guard initial mounting with `if (mapInstanceRef.current) return` to eliminate double-mounting bugs in React 19 StrictMode. On unmount, invoke `map.remove()` and reset `mapInstanceRef.current = null`.
  4. **Container Dimension Resilience:** Set explicit non-zero height (`style={{ minHeight: height, height }}`) and observe dimensions via `ResizeObserver`, calling `map.invalidateSize()` on resizing and upon mount (`requestAnimationFrame` + timeout) to prevent gray tile collapse.
  5. **OpenStreetMap Compliance:** Use standard raster tiles (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) with mandatory attribution notice (`© OpenStreetMap contributors`) and link to copyright policy.
  6. **Privacy-Conscious Centering:** Center maps strictly via destination metadata and curated coordinates (`mapUtils.js`). Prohibit unsolicited browser geolocation calls.
- **Rationale:**
  - Guarantees 100% compatibility with React 19 and Vite bundling.
  - Eliminates tile rendering artifacts and layout timing glitches.
  - Conforms to OpenStreetMap Tile Usage Policies and privacy guidelines.
- **Consequences:**
  - Day 39 itinerary markers and custom category pins will mount directly into the Leaflet map instance via `LeafletMapContainer`.

---

### ADR-023: Custom SVG Category Pins, LayerGroup Lifecycle, and Sanitized Editorial Popups for Itinerary Activity Markers
- **Status:** 🟢 CONFIRMED (Implemented Day 39)
- **Context:** Following Day 38's Leaflet mapping foundation, Day 39 requires rendering interactive markers and editorial popups for all itinerary activities with valid coordinates. Key challenges included:
  1. Supporting both direct (`activity.latitude`) and nested (`activity.location.latitude`) schemas from `Trip.js`.
  2. Rendering high-contrast, scalable pins matching TripMind's design system without external image assets or broken icon paths.
  3. Disambiguating multiple activities sharing identical coordinates so pins do not occlude each other.
  4. Preventing duplicate markers and memory leaks during React re-renders.
  5. Neutralizing XSS risks when rendering activity text in Leaflet HTML popups.
- **Decision:**
  1. **Coordinate Normalization (`extractActivityCoordinates`):** Inspect direct properties first, fall back to nested location objects, parse string numbers, and validate WGS84 bounds. Activities lacking coordinates are safely excluded from the map while preserved in the itinerary.
  2. **Identical Coordinate Disambiguation (`applyCoordinateDisambiguation`):** Apply a microscopic circular offset (~7m) to subsequent stops sharing exact coordinates, keeping all pins visible and individually clickable.
  3. **Custom Category SVG Pins (`createMarkerSvg`):** Generate standalone SVG teardrop pins (32x40px) using `L.divIcon`, color-coded to the 5 schema categories (`stay`, `food`, `transit`, `activity`, `other`), with an inner white circle and bold Day badge (`D1`, `D2`, etc.).
  4. **LayerGroup Lifecycle (`ActivityMarkers.jsx`):** Encapsulate markers inside an `L.layerGroup`. On itinerary updates, `clearLayers()` wipes old markers before repopulating, preventing duplicate pins. On unmount, the layer group is removed from the map.
  5. **OWASP XSS Sanitization (`escapeHtml`):** Sanitize all activity fields (title, location, time, duration, cost) prior to populating Leaflet popup HTML.
  6. **Dynamic Bounds Fitting:** Fit bounds across all mapped stops with `maxZoom: 15` and comfortable padding; center on single stop at zoom `14`; retain destination view if zero stops are mapped.
- **Rationale:**
  - Guarantees 100% asset resilience with zero image 404s.
  - Eliminates DOM memory leaks and duplicate marker artifacts.
  - Adheres strictly to security and privacy guidelines.
- **Consequences:**
  - `LeafletMapContainer` provides `MapContext` for child components.
  - Day 40 can integrate day-filtered marker visibility without altering marker generation logic.

---

### ADR-024: Stateless Bounded-History AI Travel Assistant API with Structured Trip-Context Isolation
- **Status:** 🟢 CONFIRMED (Implemented Day 40)
- **Context:** Following Day 39's mapping enhancements, Week 6 Day 40 requires an AI travel assistant backend API (`POST /api/trips/:tripId/assistant/messages`) capable of answering user questions grounded in their active trip itinerary. Key architectural and security challenges included:
  1. Preventing prompt injection and role confusion from user-supplied inputs or trip metadata fields.
  2. Bounding token consumption within Google AI Studio's Free Tier (₹0 budget) across multi-turn conversations.
  3. Eliminating the database and maintenance overhead of persistent conversation storage in MongoDB for MVP.
  4. Preventing multi-tenant resource enumeration on unowned trip IDs.
  5. Enforcing request rate limiting to protect LLM quotas from client spam.
- **Decision:**
  1. **Stateless Bounded-History Protocol:** Clients maintain conversation state locally and submit an optional bounded history array (maximum 6 messages / 3 full turns) alongside the current question. The backend persists zero conversation records in MongoDB, keeping the architecture simple, stateless, and cost-free.
  2. **Role Whitelisting & Input Validation (`assistantValidator.js`):** Messages are limited to 1,000 characters. History items strictly whitelist roles `'user'` and `'assistant'`. Attempts to submit `'system'` or `'developer'` roles are rejected immediately with HTTP 400 `VALIDATION_ERROR`.
  3. **Delimited Context Assembly (`assistantContextService.js`):** Extracts only public/editorial trip metadata, traveler style preferences, itemized categorical budget summaries, and daily activity stops. Truncates activity descriptions to 200 characters and encloses reference data in `<trip_context>...</trip_context>` tags.
  4. **Grounding & Persona System Prompt (`assistantPrompt.js`):** Employs `ASSISTANT_SYSTEM_INSTRUCTION` establishing TripMind's mindful editorial travel advisor. Strictly instructs the model that `<trip_context>` contains non-executable factual reference data, mandates differentiating saved itinerary stops from general recommendations, prohibits hallucinations of booking confirmations or live ticket availability, and maps client role `'assistant'` to Gemini SDK role `'model'`.
  5. **In-Memory Rate Limiting (`rateLimiter.js`):** `assistantLimiter` enforces a sliding window of max 15 requests per minute per authenticated user (or IP fallback). Requests exceeding the quota return HTTP 429 `RATE_LIMIT_EXCEEDED` with `Retry-After` headers.
  6. **Multi-Tenant Anti-Enumeration Isolation:** `tripService.getTripById(userId, tripId)` enforces query-level ownership filtering. Requests for unowned or nonexistent trips return identical HTTP 404 `NOT_FOUND` responses (`"Trip not found"`).
  7. **Timeout Guard & Normalized Error Mapping (`assistantService.js`):** Implements a 30-second `Promise.race` timeout returning HTTP 504 `AI_TIMEOUT`. Normalizes provider errors to standard HTTP status codes (429, 502, 503, 504).
  8. **Frontend API Client (`assistantApi.js`):** Encapsulates HTTP transport in `client/src/services/api/assistantApi.js` ready for Day 41 Chat UI integration.
- **Rationale:**
  - Guarantees zero credential exposure and absolute resistance to prompt-injection attacks.
  - Maintains strict ₹0 operating cost within Google AI Studio's free tier.
  - Eliminates database schema churn and data accumulation for ephemeral conversational turns.
- **Consequences:**
  - Day 41 will implement the frontend chat interface, managing conversational message history in React state / localStorage.

---

### ADR-025: In-Memory Bounded Conversational UI State, In-Place Error Retries, and Zero-Dependency Markdown Formatter for AI Travel Assistant Interface
- **Status:** 🟢 CONFIRMED (Implemented Day 41)
- **Context:** Following Day 40's backend AI Assistant API implementation (`POST /api/trips/:tripId/assistant/messages`), Day 41 requires an intuitive, accessible, and responsive conversational chat interface (`AssistantChat.jsx`) integrated within `TripDetailPage.jsx`. Key challenges and constraints:
  1. The assistant responds in rich Markdown (headings, lists, bold text, blockquotes, code spans, links), but adding heavy external Markdown libraries (like `react-markdown` or `marked`) increases bundle size and introduces React 19 / Vite peer dependency friction.
  2. The backend contract limits `history` to max 6 prior messages (3 full turns) and excludes the newest message being sent (which is delivered in `message`).
  3. Network dropouts, LLM timeouts, and rate limits require clear, non-intrusive feedback and in-place retry capabilities without duplicating user messages in the chat stream.
  4. Navigating between different trips in the workspace must never leak conversations from one trip to another.
  5. Accessibility (`role="log"`, `aria-live="polite"`, keyboard submit) and responsive layout (mobile 375px to desktop) must strictly conform to TripMind's design system.
- **Decision:**
  1. **In-Memory Ephemeral State Architecture:** Conversation state (`messages`) is held in component React state, starting clean with a contextual welcome hero card (`trip.destination`, `trip.numberOfTravellers`, `trip.budget`) and 4 curated suggested prompt pills (`SUGGESTED_QUESTIONS`). Persistent chat database collections or local storage synchronization are strictly avoided for MVP, preserving stateless cleanliness.
  2. **Bounded History Slicing & Anti-Duplication:** While the UI maintains the full visible conversation stream, API requests slice `priorEligible.slice(-6)` where prior eligible messages strictly exclude the newest prompt being submitted (which is passed in the `message` field).
  3. **Zero-Dependency Pure JS Markdown Formatter (`markdownParser.js` & `MarkdownContent.jsx`):** A custom lightweight tokenizer converts raw AI responses into clean block elements (headers `###`, bullet lists `<ul>`, numbered lists `<ol>`, blockquotes `<blockquote>`, paragraphs `<p>`) and inline elements (bold, italic, code spans, sanitized links). Implemented in pure JS for 100% testability in Node.js ESM without JSX transpilers.
  4. **In-Place Error Recovery & Retries:** Failed submissions capture the prompt in `lastFailedMessage` and display an accessible alert banner (`role="alert"`). Clicking "Retry" re-dispatches the query while reusing the existing user speech bubble, eliminating duplicate messages.
  5. **Strict Multi-Trip Scoping:** Tracks `prevTripId` against `trip._id`. Any change in trip immediately resets `messages`, `input`, `isLoading`, and `error`, preventing cross-trip message leakage.
  6. **Ergonomic Accessibility & Keyboard Submission:** Multi-line textarea submits on `Enter` (without Shift) and inserts newlines on `Shift + Enter`. Real-time character counter (`${input.length}/1000`) informs travelers of payload limits.
- **Rationale:**
  - Zero added bundle bloat or third-party dependency vulnerabilities.
  - Guarantees complete protocol alignment with Day 40's backend validator.
  - Prevents data leakage and ensures seamless user experience across mobile and desktop viewports.
- **Consequences:**
  - Conversations remain ephemeral per session/trip view.
  - Day 42 full MVP regression testing can evaluate end-to-end trip planning with the assistant.

---

### ADR-026: End-to-End Integration Testing Strategy, Zero-Cost Test Provider Isolation, and MVP Stabilization Baseline
- **Status:** 🟢 CONFIRMED (Implemented Day 42)
- **Context:** Week 6, Day 42 marks the final integration audit and stabilization milestone for the TripMind MVP. A comprehensive testing architecture was required to verify all 8 core user journeys (Authentication, Trip Creation, AI Itinerary Generation, Activity Modification, Budget Planning, Destination Discovery, Interactive Maps, and Context-Aware AI Travel Assistant) without incurring third-party billing costs or exhausting external LLM quotas, while guaranteeing cross-browser visual fidelity across desktop, tablet, and mobile breakpoints.
- **Decision:**
  1. **Dual-Tier E2E Testing Paradigm:**
     - *Tier 1 (Automated Headless Node.js E2E Suite):* Implemented in `scratch/test_day42_e2e_integration.mjs`. Spawns an ephemeral HTTP loopback server wrapping the Express `app`, running direct multi-user integration tests across all 8 journeys using native `fetch`. Validates cookie transmission, database operations, anti-enumeration protections, budget calculations, and error flows.
     - *Tier 2 (Real Browser Automation via Chrome DevTools Protocol):* Implemented in `scratch/run_browser_day42_full_audit.mjs`. Automates Microsoft Edge in headless Chromium mode across Desktop (1440x900), Tablet (768x1024), and Mobile (375x812) viewports. Validates visual rendering, Recharts SVGs, Leaflet tile layers, popup interactions, and mobile drawer transitions, capturing timestamped screenshot artifacts in `scratch/`.
  2. **Zero-Cost LLM Test Provider Isolation:**
     - External Google Gemini API calls during automated integration tests are intercepted by dependency-injected mock provider clients (`clientOverride`).
     - Simulates realistic structured itinerary generation, streaming timeouts, and error scenarios without consuming Google AI Studio API quota, guaranteeing ₹0 operating cost during testing.
  3. **Multi-Tenant Anti-Enumeration Baseline:**
     - Query-level ownership (`_id: tripId, userId: user._id`) is strictly enforced across all trip endpoints (`GET`, `PATCH`, `DELETE`, `generate-itinerary`, and `assistant/messages`), uniformly returning HTTP 404 `NOT_FOUND` to unowned resource requests.
  4. **Single-Process Rate Limiting Architectural Baseline:**
     - Standardized on `assistantLimiter` (in-memory sliding window, 15 req/min) for MVP single-instance deployments, documenting Redis requirement for horizontal cluster scale-out.
  5. **Defensive Markdown Sanitization & Stale Response Prevention:**
     - `MarkdownContent.jsx` enforces strict URL validation (`/^https?:\/\//i`), rejecting dangerous schemes.
     - `AssistantChat.jsx` compares live trip references upon response resolution to discard stale responses from in-flight queries if the user switches trips.
- **Rationale:**
  - Guarantees 100% test reproducibility with zero financial cost.
  - Eliminates flaky UI tests by utilizing direct protocol-level CDP evaluation.
  - Establishes a hardened, production-ready baseline for the complete MVP release.
- **Consequences:**
  - Automated CI/CD pipelines can run both test tiers independently.
  - The MVP is verified complete and ready for demonstration.

---

### ADR-027: Purposeful UI Motion & Animation Architecture using Motion (v14) with Strict Reduced-Motion Compliance
- **Status:** 🟢 CONFIRMED (Implemented)
- **Context:** Following the establishment of `UI_MOTION_GUIDELINES.md`, TripMind requires a coordinated set of 7 UI animations to elevate the user experience to feel like a modern, polished travel SaaS product without compromising its calm editorial identity, performance, or accessibility.
- **Decision:**
  1. **Library Selection (`motion` v14.14.0):** Integrated modern `motion` package with full React 19 compatibility and `@` path alias in Vite.
  2. **Core Primitives Isolation (`client/src/components/core/`):** Encapsulated all motion behavior inside 7 reusable components (`AnimatedBackground`, `BorderTrail`, `AnimatedFormField`, `TextEffect`, `ScrollProgress`, `Tilt`, `ScrollReveal`). Application pages and domain components consume these primitives cleanly without embedding inline animation mechanics.
  3. **Strict Composite-Only GPU Performance:** Restricted all animations strictly to `transform` and `opacity`, ensuring 60fps rendering without layout reflows (CLS: 0).
  4. **Strict `prefers-reduced-motion` Compliance:** Every component synchronously inspects media query preferences on mount and subscribes to changes, delivering instant, static fallbacks for users who prefer reduced motion.
  5. **Viewport Motion Budgeting:** Enforced Level 4 signature isolation—restricting `BorderTrail` to at most one featured card on the dashboard (`idx === 0`) and suppressing form animations when validation errors occur.
  6. **Pointer and Touch Gating:** Tilt and hover background effects are gated to pointer-fine devices (`(hover: hover) and (pointer: fine)`), preventing touch-device misfires.
- **Rationale:**
  - Preserves literary editorial tranquility while providing smooth interactive feedback.
  - Guarantees 100% WCAG 2.2 accessibility compliance and zero layout shifts.
  - Fully verified via automated Microsoft Edge CDP testing.
- **Consequences:**
  - All future animation additions must use these core components and adhere to `UI_MOTION_GUIDELINES.md`.

---

### ADR-028: Destination Imagery Architecture, Mobile Scroll-Snap Carousels, and Database Index Optimization
- **Status:** 🟢 CONFIRMED (Implemented)
- **Context:** TripMind required visual enrichment for travel itineraries and PDF exports, improved mobile user experience for homepage discovery and instructional content, and database query optimization for filtered user trip lookups and public sharing.
- **Decision:**
  1. **Destination Imagery Model & Fallback Pipeline:**
     - Extended `Trip` schema with backward-compatible `destinationImages` subdocument array (`[{ url, alt, caption }]`), supporting up to 2 photographs per trip.
     - Implemented `getDestinationPhotos(trip)` resolving images across a deterministic priority pipeline: (1) `trip.destinationImages`, (2) `trip.coverImageUrl`, (3) curated destination image registry (Kyoto, Swiss Alps, Bali, Manali, Varanasi, Amalfi), or (4) empty array `[]`.
     - Uses standard native `new URL(..., import.meta.url).href` for asset paths, eliminating bundler incompatibilities and runtime `ERR_UNKNOWN_FILE_EXTENSION` errors in Node test harnesses.
  2. **Itinerary UI & PDF Export Imagery Layout:**
     - UI dual-photo plate in `TripDetailPage.jsx` using responsive `grid-cols-1 sm:grid-cols-2` grid, rounded-xl styling, and per-image load error handling that gracefully falls back to an editorial Compass icon badge plate.
     - Integrated printable `.pdf-imagery-gallery` into client-side PDF generator (`tripPdfExporter.js`) with CSS page-break avoidance (`break-inside: avoid`), safe image load error hiding (`onerror="this.parentElement.style.display='none';"`), Indian Rupee glyph (`₹`), and Unicode glyph preservation.
  3. **Zero-Dependency Native Mobile Carousels:**
     - Replaced vertical stacking on mobile (< 768px) with native CSS scroll-snapping horizontal carousels (`snap-x snap-mandatory scroll-smooth no-scrollbar`) for both "How to Use TripMind" (`HowItWorks.jsx`) and "Find Your Next Somewhere" (`DestinationDiscovery.jsx`).
     - Preserved desktop/tablet grid systems (`md:grid`) completely without altering layouts at >= 768px.
     - Employed viewport-percentage card widths (`82vw` and `84vw`) providing ~16–18vw peek affordances that intuitively indicate scrollability.
     - Synchronized dot indicator navigation with touch scroll and click-to-scroll handlers.
  4. **Database Index Optimization:**
     - Added compound index `{ userId: 1, status: 1, createdAt: -1 }` on `Trip` collection to accelerate status-filtered user dashboard queries.
     - Verified partialFilterExpression index on `shareSettings.shareTokenHash` (optimizing storage by only indexing shared trips with string hashes).
- **Rationale:**
  - Enriches visual appeal of itineraries and exports at ₹0 operational cost (no paid image APIs).
  - Significantly reduces mobile scroll length and cognitive fatigue while strictly maintaining zero horizontal page overflow.
  - Improves MongoDB query performance from $O(N)$ collection scans to $O(1)$/$O(\log N)$ index seeks.
- **Consequences:**
  - Legacy trips with 0 images continue to load cleanly with zero layout shift or empty image plates.
  - Carousels rely entirely on native browser scrolling with zero runtime bundle bloat.

---

### ADR-029: Homepage Storytelling Section, Dedicated About Us Architecture, and Brand Signature Standards
- **Status:** 🟢 CONFIRMED (Implemented Day 53)
- **Context:** The homepage "How to Use TripMind" section was overly textual and explanatory. Navigation contained broken anchor links (`/#itineraries`, `/#budget`, `/#about`), and the platform lacked a dedicated About Us page and cohesive closing brand signature.
- **Decision:**
  1. **Homepage Storytelling Redesign ("From Inspiration to Itinerary."):**
     - Renamed the section from "How to use TripMind." to **"From Inspiration to Itinerary."** under eyebrow **"The Journey Unfolds"** while preserving `id="how-it-works"` for backwards compatibility.
     - Condensed lengthy explanatory copy into 5 concise, engaging steps (`Discover Your Vibe`, `Set Your Canvas`, `Curate with AI`, `Tailor Every Stop`, `Wander with Clarity`).
     - Added interactive desktop step timeline progression track (nodes 01–05) with active step highlighting (`border-terracotta/70 ring-2 ring-terracotta/20`).
     - Preserved and refined Day 52 mobile scroll-snapping carousel (`82vw` cards, synchronized terracotta pagination dots, touch swiping).
  2. **Dedicated About Us Route & Page Architecture (`/about`):**
     - Mounted dedicated `AboutPage.jsx` at route `/about` wrapped in `<PublicLayout>`, fully resilient to direct browser page refresh.
     - Structured strictly around actual application capabilities: Executive Mission, Problem & Antidote (fragmentation, blind AI, budget disconnect), 6 Core Capabilities (Discovery, Gemini AI, Leaflet/OSM Maps, Recharts Budgeting, Journal Noticeboard, Cryptographic Sharing/PDF Export), Literary Field Journal Philosophy, and Closing CTAs.
     - Embedded curated destination imagery plates (Kyoto, Amalfi Coast, Swiss Alps) with open-access attribution.
  3. **Footer Redesign & Brand Sign-Off:**
     - Added memorable closing brand signature: **"Ready. Steady. Go."** in Playfair Display serif italic with terracotta sparkles accent.
     - Completely eliminated dead links (`/#itineraries`, `/#budget`). Organized navigation into Explore, Capabilities, and Data & Attribution columns.
  4. **Desktop & Mobile Navigation Consistency:**
     - Standardized primary links to `The Journey`, `Destinations`, `Itineraries` (routing to `/dashboard`), and `About Us` (routing to `/about`).
     - Implemented active route indicator for `/about`.
     - Ensured mobile hamburger drawer closes automatically upon link navigation.
- **Rationale:**
  - Strengthens TripMind's brand identity as a thoughtful, literary travel product.
  - Eliminates dead links and provides genuine educational value for prospective travelers.
  - Maintains zero-overflow responsive discipline across all 7 viewports (320px to 1920px).
- **Consequences:**
  - All navigation links now route to active, verified destinations.
  - About Us content reflects only real codebase features with zero fictional marketing claims.

---

### ADR-030: Email Verification and Password Recovery Architecture
- **Status:** 🟢 CONFIRMED
- **Context:** TripMind accounts require self-service password recovery and verified email communication to protect user itineraries, prevent account takeover, and avoid fake account creation, while preserving the existing stateless HttpOnly cookie architecture (ADR-010) and guaranteeing that legacy accounts predating this feature in MongoDB Atlas retain uninterrupted access.
- **Decision:**
  1. **Token Cryptography & Storage:**
     - High-entropy tokens generated using `crypto.randomBytes(32).toString('hex')` (256 bits).
     - Tokens are stored in MongoDB exclusively as SHA-256 hashes (`hashToken`), ensuring that a read-only database leak does not expose valid authentication tokens.
     - Single-use lifecycle: tokens are consumed atomically using MongoDB `$unset` operations.
     - Expirations: 24 hours for email verification; 30 minutes for password reset.
  2. **Strict Anti-Enumeration Design:**
     - `POST /api/auth/forgot-password` and `POST /api/auth/resend-verification` return identical generic success responses (HTTP 200) regardless of whether an email is registered, unverified, already verified, or unknown.
  3. **Legacy Migration Safety:**
     - The Mongoose `User` schema declares `isEmailVerified: { type: Boolean }` without a default value, ensuring that legacy documents in MongoDB Atlas hydrate with `isEmailVerified: undefined`.
     - Login authorization logic evaluates `if (user.isEmailVerified === false)` (or `user.isVerified()`), grandfathering legacy accounts while strictly enforcing verification for newly registered accounts.
  4. **Single-Point Password Hashing:**
     - Password updates assign the plain text password to the user document and trigger `user.save()`, utilizing the single-point Mongoose `pre('save')` bcrypt hook and eliminating double-hashing vulnerabilities.
  5. **Cross-Device Session Invalidation on Password Reset (Day 54 Closeout):**
     - In addition to calling `res.clearCookie('token', cookieOptions)` on the resetting device, password reset updates `user.passwordChangedAt = new Date()`.
     - `authenticateToken` middleware compares JWT `decoded.iat` against `user.changedPasswordAfter(decoded.iat)`.
     - Any token issued prior to the password reset is rejected across all devices with HTTP 401 `UNAUTHORIZED`, invalidating all active sessions without introducing stateful session storage.
  6. **Rate Limiting Protection:**
     - Tiered rate limiters: `forgotPasswordLimiter` (5 per 15 min), `resetPasswordLimiter` (10 per 15 min), `resendVerificationLimiter` (3 per 15 min), and `verifyEmailLimiter` (15 per 15 min).
  7. **Transactional Email Service & Delivery Fallback Audit (Day 54 Closeout):**
     - Implemented in `server/src/services/emailService.js` using Nodemailer with editorial HTML templates and zero sensitive data/token logging.
     - Mock transport (`setMockTransport`) is strictly forbidden in production (`throw` on `config.nodeEnv === 'production'`) and restricted to automated testing.
     - Production never silently falls back to mock delivery.
     - Missing SMTP configuration in production or local environments without mock transport correctly returns `false` on `isEmailConfigured()` and throws `503 EMAIL_SERVICE_UNCONFIGURED`.
     - Registration rolls back user persistence if email delivery fails, preventing orphaned unverified accounts.
     - Recovery flows (`forgotPassword`, `resendVerification`) safely catch transport failures and preserve generic HTTP 200 responses to maintain anti-enumeration contracts.
- **Rationale:**
  - Guarantees high cryptographic security and compliance with OWASP password recovery guidelines.
  - Completely prevents account enumeration attacks.
  - Ensures seamless backward compatibility with existing users in MongoDB Atlas without requiring complex database migration scripts.
- **Consequences:**
  - Newly registered users cannot log in until they verify their email.
  - Unit and integration tests must configure mock transports or rely on the development fallback transport.

---

### ADR-031: Temporary Protected Production SMTP Diagnostic Mechanism for Constrained Hosting (Render Free Plan)
- **Status:** 🟢 CONFIRMED (Implemented Day 55)
- **Context:** Render Free Plan does not provide an interactive SSH Shell or CLI access to running container environments. While SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`) were configured on Render, production registration failures required definitive verification of actual Gmail SMTP connectivity and authentication without guessing, exposing credentials, sending test emails, or creating fake user accounts.
- **Decision:**
  1. **Direct Transporter Reuse:** Reuse `emailService.getTransporter()` rather than creating a separate or duplicated SMTP client, ensuring verification reflects the exact configuration and transport used by production registration.
  2. **Non-Destructive Verification:** Call `transporter.verify()` to validate TCP connection, TLS/STARTTLS handshake, and SMTP AUTH without sending an email or altering database state.
  3. **Strict Conditional Registration:** In `server/src/app.js`, wrap the route mounting in `if (config.smtpDiagnostic?.enabled)`. When disabled or unconfigured, the route does not exist in the Express routing table and returns HTTP 404.
  4. **Cryptographic Protection & Constant-Time Verification:** Require high-entropy `SMTP_DIAGNOSTIC_TOKEN` generated via `crypto.randomBytes(24).toString('hex')` (yielding 48 hexadecimal characters / 192 bits of entropy). Accept the token strictly and exclusively via the `x-smtp-diagnostic-token` header, explicitly rejecting Bearer authorization and request body alternatives to prevent accidental token exposure in HTTP proxy access logs or payload traces. Validate incoming tokens by hashing candidate and expected tokens with SHA-256 and comparing the resulting 32-byte buffers with `crypto.timingSafeEqual` to avoid timing side-channels and buffer length mismatch errors.
  5. **Strict Rate Limiting & Method Enforcing:** Apply `smtpDiagnosticLimiter` (5 requests / 15 minutes per IP). Reject all non-`POST` HTTP methods with HTTP 405 `METHOD_NOT_ALLOWED`.
  6. **Strict Error Sanitization:** Sanitize all transporter errors into standardized error codes (`EAUTH`, `ETIMEDOUT`, `ECONNREFUSED`, `ENOTFOUND`, `ETLS`) and generic operational messages. Never return passwords, email addresses, tokens, or raw SMTP dialogue.
  7. **Ephemeral Operational Policy:** This diagnostic is strictly temporary. Following verification, the environment variables are removed from Render, disabling the endpoint immediately, followed by code removal in the subsequent cleanup commit.
- **Rationale:**
  - Provides empirical proof of SMTP connectivity and credential validity directly inside the cloud environment.
  - Zero attack surface when the feature flag is disabled (`SMTP_DIAGNOSTIC_ENABLED !== 'true'`).
  - Immune to brute-force attacks via rate limiting and timing-safe authentication.
- **Consequences:**
  - Facilitates immediate identification of Gmail App Password misconfiguration or cloud egress restrictions without impacting production users.

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
- **Status:** 🟢 RESOLVED (See ADR-022)
- **Options Under Consideration:**
  - *Option A: `react-leaflet`* — Declarative React wrapper around Leaflet elements.
  - *Option B: Vanilla Leaflet with React `useRef` & `useEffect`* — Complete control over lifecycle, avoids version mismatch issues with React 19/Vite.
- **Resolution:** Adopted Option B (Vanilla Leaflet with React `useRef` and `useEffect` in `LeafletMapContainer.jsx`). Confirmed as **ADR-022**.

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
