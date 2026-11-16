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
    - Each document in `trips` references its owner via `userId` (`type: mongoose.Schema.Types.ObjectId, ref: 'User'`).
    - For the MVP, `ItineraryDay` (days array), `Activity` (activities array within each day), and `BudgetSummary` are embedded subdocuments inside the `Trip` document.
    - Deleting a `Trip` document automatically and atomically deletes its embedded subdocuments in a single operation with zero multi-collection cascading operations required.
  - **Backend Layer Responsibilities:**
    - **Server Entry (`server/server.js`):** Application entry point. Loads environment variables, connects to MongoDB via Mongoose, starts HTTP listener, and manages graceful shutdown.
    - **App Configuration (`server/src/app.js`):** Configures middleware (`cors`, `helmet`, `express.json`), mounts routes, and mounts error handlers.
    - **Models (`server/src/models/`):** Define Mongoose schemas, types, validators, indexes, and interact directly with MongoDB to perform queries and persist documents.
    - **Services (`server/src/services/`):** Contain all domain and business logic, perform budget computations, orchestrate AI generation, and execute database operations exclusively through Mongoose models.
    - **Controllers (`server/src/controllers/`):** Coordinate HTTP requests and responses, parse input parameters, invoke domain services, and return standardized JSON responses. Zero business logic or direct database queries.
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

## 2. Pending Decisions (🟡 UNDER EVALUATION)

The following architectural and technical choices are open for evaluation during future implementation planning. **Do not mark pending decisions as confirmed.**

### Pending-001: Specific LLM Provider & Model Selection
- **Status:** 🟡 UNDER EVALUATION
- **Options Under Consideration:**
  - *Option A: Google Gemini API (e.g., Gemini 1.5 Pro / Flash)* — Large context window, strong structured JSON output support, favorable pricing.
  - *Option B: OpenAI API (e.g., GPT-4o / GPT-4o-mini)* — Highly reliable JSON schema mode, widespread developer familiarity.
  - *Option C: Anthropic Claude API (e.g., Claude 3.5 Sonnet)* — Exceptional writing quality and nuanced travel descriptions.
- **Next Step:** Evaluate based on user's existing API keys, structured output reliability, and latency targets.

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
- **Status:** 🟡 UNDER EVALUATION
- **Options Under Consideration:**
  - *Option A: React Context API + Custom Hooks* — Zero additional dependencies, sufficient for MVP scope (Auth state + active Trip state).
  - *Option B: Zustand* — Lightweight, minimal boilerplate, eliminates unnecessary re-renders in complex itinerary editing.
  - *Option C: TanStack Query (React Query)* — Powerful server-state caching, automatic refetching, and mutation management.
- **Recommendation:** Start with React Context + Hooks for MVP; evaluate Zustand or TanStack Query if state complexity expands.

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
