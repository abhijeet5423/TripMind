# TripMind — Project Rules & Agent Guidelines

> **Status:** ACTIVE & MANDATORY  
> **Applies to:** All AI coding agents, developers, and contributors working on the TripMind repository.

---

## 1. Core Operating Principles

These rules establish strict operational boundaries. Failure to follow these rules degrades system stability, violates architecture decisions, and leads to code regressions.

### 1.1 Mandatory Documentation Review Before Every Task
Before performing any modification, planning, or code generation:
1. **Read Core Docs First**: Always inspect and cross-reference:
   - [`PROJECT_RULES.md`](./PROJECT_RULES.md) (this document)
   - [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md)
   - [`MVP_SCOPE.md`](./MVP_SCOPE.md)
   - [`ARCHITECTURE.md`](./ARCHITECTURE.md)
   - [`UI_DESIGN_SYSTEM.md`](./UI_DESIGN_SYSTEM.md)
   - [`DECISIONS.md`](./DECISIONS.md)
   - [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md)
2. **Align With Decisions**: Check [`DECISIONS.md`](./DECISIONS.md) before introducing new patterns, libraries, or architectural changes. Never contradict an established Architecture Decision Record (ADR), and never treat pending decisions as finalized.

---

## 2. Code Modification & Scope Discipline

### 2.1 Respect Existing Code
- **Never refactor or rewrite** working modules, functions, or configurations unless explicitly instructed by the user.
- **Preserve docstrings and comments**: Retain existing inline documentation, header comments, and explanatory notes unless directly invalidating them.
- **Maintain consistency**: Follow established naming conventions, formatting, and file organization patterns already present in the workspace.

### 2.2 Avoid Unrelated Modifications
- **Zero Drive-By Changes**: Do not touch files unrelated to the prompt task.
- **No Unsolicited Cleanup**: Do not reformat entire files, change indentations globally, remove unused imports in untouched files, or adjust unrelated styling.
- **Scope Containment**: Keep file diffs tight, focused, and directly traceable to the user's specific request.

### 2.3 Strict Scope & Sequence Enforcement
- Check [`MVP_SCOPE.md`](./MVP_SCOPE.md) to verify feature tier and implementation order.
- **Enforce Development Sequencing:** Work must strictly follow the planned sequential order:
  1. Project Foundation & Shared Infrastructure (configs, base layout shell, API client).
  2. Landing Page & Editorial Showcase.
  3. Authentication & User Management.
  4. Trip CRUD & Day/Activity Itinerary Management.
  5. AI Itinerary Generation, Leaflet/OSM Maps & Recharts Budgeting.
- Never prematurely implement features flagged as **Future** (e.g., conversational AI assistant, PDF export, shareable public itineraries, flight/hotel booking, collaborative real-time editing) unless explicitly requested by the user.
- Never mark incomplete or planned features as completed in tracking documents or UI elements.

---

## 3. Secret Protection & Environment Hygiene

### 3.1 Zero Credential Exposure
- **NEVER hardcode** API keys, passwords, connection strings, or JWT secrets in source code, commit messages, or documentation.
- All secrets must reside exclusively in local, uncommitted `.env` files:
  - `server/.env` (e.g., `PORT`, `MONGODB_URI`, `JWT_SECRET`, `LLM_API_KEY`)
  - `client/.env` (e.g., `VITE_API_BASE_URL`)
- Ensure `.gitignore` in both root and subdirectories explicitly ignores `.env`, `.env.local`, `.env.*.local`, and sensitive log files.

### 3.2 Template Maintenance
- Whenever a new environment variable is introduced, immediately document it in the corresponding `.env.example` file with an empty or sanitized placeholder value (e.g., `LLM_API_KEY=your_llm_api_key_here`).

---

## 4. Architectural Integrity & Layer Separation

### 4.1 Backend Architecture & Directory Standardization
The backend architecture separates the server entry point from the Express application configuration and internal layers:
1. **Server Entry (`server/server.js`)**: Application entry point. Loads environment variables (`dotenv`), initializes database connection with MongoDB (local instance or MongoDB Atlas), starts the HTTP server listening on the configured port, and handles process signals for graceful shutdown.
2. **App Configuration (`server/src/app.js`)**: Initializes Express `app`, configures top-level middleware (`cors`, `helmet`, `express.json`), mounts API route routers (`/api/...`), and mounts 404 and centralized error handlers. Does not listen on a port or directly initiate database connections.
3. **Routes (`server/src/routes/`)**: Define endpoint paths, HTTP verbs, and bind route middleware to controller handlers. Zero business logic or database interactions.
4. **Middleware (`server/src/middleware/`)**: Handle cross-cutting concerns (token verification, request payload validation, rate limiting, centralized error handling).
5. **Controllers (`server/src/controllers/`)**: Coordinate HTTP requests and responses. Parse inputs (`req.params`, `req.query`, `req.body`, `req.user`), dispatch work to domain services, and return standardized HTTP responses. Controllers do not execute business logic or direct database queries.
6. **Services (`server/src/services/`)**: Contain domain and business logic, orchestrate AI LLM API integrations, perform budget calculations, and execute database operations through Mongoose models. Services remain decoupled from Express `req`/`res` objects.
7. **Models (`server/src/models/`)**: Define Mongoose schemas, field types, validations, default values, and indexes. Interact directly with MongoDB to perform queries and persist documents.
8. **Configuration Layer (`server/src/config/`)**: Manages centralized, validated environment variables (`env.js`) and database connection lifecycles (`db.js`). Strictly prohibits hardcoding credentials or exposing secrets in error traces or console logs. MONGODB_URI must be validated prior to database connection and HTTP server binding.

### 4.2 Database Modeling Discipline
- **Separate Collections:** `User` and `Trip` are stored as distinct, independent MongoDB collections. Trips reference users via the `userId` field (`ObjectId`).
- **Embedded Subdocuments (MVP):** Itinerary days (`ItineraryDay`), activities (`Activity`), and budget summaries (`BudgetSummary`) are embedded directly within the `Trip` document for the MVP.
- **Atomic Deletions, No Relational Cascades:** Deleting a `Trip` document automatically removes its embedded subdocuments as a single atomic operation; no multi-collection cascade logic is required or allowed.

### 4.3 Password Hashing Rule (Single Point of Truth)
- Password hashing must occur in **exactly one location** to avoid double-hashing bugs.
- **Designated Location:** Mongoose `User` model `pre('save')` hook (`server/src/models/User.js`).
- Services (`server/src/services/authService.js`) pass the raw validated password to `User.create()` and must **never** hash the password beforehand. For authentication, the service invokes the schema instance method `user.comparePassword(candidatePassword)`.

### 4.4 Frontend Architecture & API Client Layer (`client/src/`)
- **Component Modularity**: Divide UI elements logically into `components/common` (buttons, inputs, modals), `components/layout` (navbar, footer, shell), and feature components (`components/itinerary`, `components/budget`, `components/map`, `components/discovery`).
- **Service Layer for HTTP**: All network requests to Express APIs must go through dedicated API client modules located in `client/src/services/api/` (e.g., `apiClient.js`, `authApi.js`, `tripApi.js`, `aiApi.js`). Components must never invoke raw `fetch` or instantiate separate Axios instances.
- **Design System Fidelity**: Adhere strictly to the color codes, font families, and visual rules in [`UI_DESIGN_SYSTEM.md`](./UI_DESIGN_SYSTEM.md). Style definitions must leverage Tailwind CSS v4's CSS-first `@theme` configuration in `client/src/index.css`.

### 4.5 Static Asset Performance & Image Optimization Discipline
- **Modern Asset Formats**: Large photographic and atmospheric imagery imported into the client application must utilize modern, compressed formats (WebP as standard default, targeting 300–600 KB per full-bleed image) to eliminate bundle bloat while preserving desktop sharpness.
- **Original Asset Preservation**: Never delete or overwrite raw high-resolution master image files; preserve them as local backups alongside optimized assets.
- **Aspect Ratio & Composition**: Maintain original aspect ratios and downsample using high-quality bicubic interpolation to prevent stretching or pixelation.
- **Zero Dependency Overhead**: Asset conversions must be performed via standalone utilities or scripts without polluting `package.json` with unnecessary build-time image dependencies.

### 4.6 Media Sourcing, Licensing & Creator Attribution Discipline
- **Verifiable Provenance**: All photographic assets imported into `client/src/assets/` must originate from reputable royalty-free repositories (e.g., Wikimedia Commons, Unsplash) under verified open-access licenses (e.g., CC BY 4.0, CC BY-SA 4.0, CC BY-SA 2.0).
- **Mandatory Attribution Records**: Every photographic asset must maintain an immutable attribution record documenting the creator/photographer, source platform, canonical source URL, and applicable license in corresponding data modules and development logs.
- **Strict Prohibition of Unverified Assets**: Never introduce watermarked imagery, unverified commercial stock assets, duplicate photographs across distinct destinations, or images lacking verifiable usage permissions.

---

## 5. Security & Network Protocols

### 5.1 Backend Mediation of AI & External Services
- The frontend must never call LLM APIs directly.
- LLM API tokens must remain secure inside `server/.env`.
- The frontend communicates only with the Express backend API.

### 5.2 Authentication & Token Handling
- User authentication uses JWT and bcrypt.
- **Token Storage Evaluation:** The final client-side token storage mechanism (HttpOnly Secure cookies vs. client-held Bearer tokens) is an open architectural decision tracked as **PENDING** in [`DECISIONS.md`](./DECISIONS.md) (`Pending-002`). Code and documentation must not assume either mechanism is finalized.
- **Stateless Logout vs. Revocation:** MVP logout is performed by clearing the client-side credential/cookie. Server-side token blacklists and active token revocation are explicitly deferred beyond the MVP.

### 5.3 Standardized API Responses
All backend JSON responses must strictly adhere to the standardized response envelope. In error responses, `details` must always be an array—defaulting to an empty array `[]` when no additional detail objects are provided:

```json
// Success Response
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive status"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation",
    "details": []
  }
}
```

### 5.4 Input Validation & Sanitization
- Validate and sanitize all user input on the server before processing or database insertion.
- Guard against MongoDB operator injection, malformed date ranges, and unvalidated LLM output structures.

---

## 6. Testing, Verification & Development Logging

### 6.1 Verification Requirement
- After completing changes, verify functionality by running relevant build, lint, or test commands.
- Check browser and server logs for uncaught exceptions, unhandled Promise rejections, or CORS misconfigurations.

### 6.2 Mandatory Development Log Updates
- Every working session or completed task must be documented in [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md).
- Follow the standardized dated log format detailing:
  - Date and author/agent
  - Summary of work
  - Files created or modified
  - Concepts and architectural patterns applied
  - Verification & testing performed
  - Known issues, blockers, or pending next steps.
