# TripMind — System Architecture & Technical Design

> **Document Status:** Active Baseline  
> **Applies to:** Frontend (`client/`), Backend (`server/`), and Database (`MongoDB Local / Atlas`).

---

## 1. System Overview

TripMind follows a decoupled client-server architecture. The frontend is a single-page application (SPA) built with React and Vite, styled using Tailwind CSS v4's CSS-first `@theme` configuration. The backend is a RESTful API built on Node.js and Express with its application entry point at `server/server.js` and modular application code under `server/src/`. Persistent data is stored in MongoDB (local instance for development or MongoDB Atlas in cloud deployment) via Mongoose ODM. External integrations (such as LLM APIs) are strictly mediated through backend services to protect credentials and enforce business logic.

```mermaid
flowchart TD
    subgraph Client ["Client Tier (React + Vite SPA)"]
        UI["UI Components & Pages (Tailwind CSS v4)"]
        Router["React Router"]
        AxiosClient["Axios HTTP Client (client/src/services/api/)"]
        LeafletRenderer["Leaflet (Map Rendering Engine)"]
        Charts["Recharts Visualizations"]
    end

    subgraph Server ["Server Tier (Node.js + Express REST API)"]
        Entry["server/server.js (DB Conn & HTTP Listener)"]
        App["server/src/app.js (Express App, Middleware, Routes)"]
        Routes["Routes Layer (server/src/routes/)"]
        Middleware["Middleware (server/src/middleware/: Auth, Validation, Errors)"]
        Controllers["Controllers Layer (server/src/controllers/)"]
        Services["Services Layer (server/src/services/: Logic, AI Proxy, Budget Math)"]
        Models["Models Layer (server/src/models/: Mongoose Schemas & DB Interface)"]
    end

    subgraph DataExternal ["Data & External Services Tier"]
        Mongo[("MongoDB Database (Local / Atlas)")]
        LLM["External LLM Provider API"]
        OSM["OpenStreetMap Tile Servers (Map Data)"]
    end

    Entry --> App
    App --> Routes
    UI --> Router
    UI --> AxiosClient
    UI --> LeafletRenderer
    UI --> Charts
    LeafletRenderer -.->|"Fetch Map Tiles (Attribution Required)"| OSM
    AxiosClient -->|"HTTP / REST API Requests"| Routes
    Routes --> Middleware
    Middleware --> Controllers
    Controllers --> Services
    Services --> Models
    Models -->|"Query / Persist Documents"| Mongo
    Services -->|"AI Generation Request"| LLM
```

---

## 2. Backend Architecture (Node.js & Express)

The backend adheres to a strict separation of concerns, decoupling root server startup (`server/server.js`) from Express application pipeline configuration (`server/src/app.js`) and internal layers under `server/src/`.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Axios API Client)
    participant Route as Express Route (server/src/routes/)
    participant Mid as Auth Middleware (server/src/middleware/)
    participant Ctrl as Controller (server/src/controllers/)
    participant Svc as Service (server/src/services/)
    participant Model as Mongoose Model (server/src/models/)
    participant DB as MongoDB (Local / Atlas)

    User->>Route: POST /api/trips
    Route->>Mid: authenticateToken(req, res, next)
    Mid-->>Route: Token verified, req.user attached
    Route->>Ctrl: tripController.createTrip(req, res, next)
    Note over Ctrl: Extracts parameters & coordinates HTTP cycle
    Ctrl->>Svc: tripService.createTrip(userId, tripPayload)
    Note over Svc: Executes business logic & validation rules
    Svc->>Model: Trip.create(validatedTripData)
    Note over Model: Schema validation & direct DB query
    Model->>DB: Insert document into 'trips' collection
    DB-->>Model: Persisted Document
    Model-->>Svc: Trip Mongoose Document
    Svc-->>Ctrl: Formatted Trip Domain Object
    Ctrl-->>User: 201 Created { success: true, data: { ... } }
```

### 2.1 Server Structure & Layer Responsibilities

#### 1. Server Entry Point (`server/server.js`)
- **Primary Role:** Lifecycle and infrastructure management.
- Loads environment variables from `.env` via `dotenv`.
- Establishes connection to MongoDB (local instance or MongoDB Atlas) through Mongoose.
- Instantiates the HTTP server wrapping the configured Express `app` and listens on `PORT`.
- Manages process event listeners (`SIGINT`, `SIGTERM`, `unhandledRejection`) for graceful shutdown and resource cleanup.
- **Strict Boundary:** Does not declare routes, mount application middleware, or contain business logic.

#### 2. Express Application Configuration (`server/src/app.js`)
- **Primary Role:** Express application factory and pipeline configuration.
- Instantiates Express `app`.
- Mounts top-level middleware: CORS (`cors`), security headers (`helmet`), JSON body parser (`express.json`), and HTTP request logging.
- Mounts API route routers under the `/api` prefix (e.g., `/api/auth`, `/api/trips`, `/api/ai`).
- Mounts 404 handler for unrecognized endpoints and the centralized error handling middleware.
- Exports the configured `app` for use by `server/server.js` and automated integration tests.
- **Strict Boundary:** Does not listen on a port and does not connect directly to the database.

#### 3. Routes (`server/src/routes/`)
- Define URL paths and map HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
- Mount route-level middleware chains (authentication guards, validation schemas).
- Dispatch incoming requests directly to the corresponding controller method.
- **Strict Boundary:** Zero business logic, data transformation, or database operations.

#### 4. Middleware (`server/src/middleware/`)
- **Authentication Guard (`authMiddleware.js`):** Extracts and validates JWT tokens from the HttpOnly `token` cookie (via `cookie-parser`), enforces `HS256` signature verification and expiration, decodes user identity, and attaches `req.user = { id: decoded.sub }`.
- **Request Validation (`validators/`):** Validates schema conformity for `req.body`, `req.params`, and `req.query` before controller execution.
- **Centralized Error Handling:** Catches all exceptions forwarded via `next(err)` and returns standardized JSON error responses with status codes.
- **Security & Parsers:** Configures CORS, JSON body parser (`express.json`), and cookie parsing (`cookie-parser`).

#### 5. Controllers (`server/src/controllers/`)
- **Primary Role:** Coordinate the HTTP request and response lifecycle.
- Extract request parameters from `req.params`, `req.query`, `req.body`, and user context from `req.user`.
- Invoke domain services with sanitized inputs.
- Set appropriate HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`).
- Construct and return the standardized JSON response envelope.
- Forward caught errors to the error-handling middleware via `next(error)`.
- **Strict Boundary:** Controllers do not contain business logic and never perform direct Mongoose/MongoDB queries.

#### 6. Services (`server/src/services/`)
- **Primary Role:** Contain and execute all domain and business logic.
- Execute database operations exclusively through Mongoose models.
- **AI Integration (`aiService.js`):** Encapsulates external Google Gemini API communication via `@google/genai`. Formats and sanitizes provider error responses, executes backend connectivity smoke testing (`verifyGeminiConnection()`), and isolates LLM provider details from controllers and client code. Full prompt generation and JSON schema output validation are scheduled for subsequent itinerary generation milestones.
- **Budget Computation (`budgetService.js`):** Perform calculations, expense categorizations, and balance tracking across itinerary days.
- **Strict Boundary:** Services are completely decoupled from Express `req` and `res` objects to ensure pure testability.

#### 7. Models (`server/src/models/`)
- **Primary Role:** Define schemas and interact directly with MongoDB.
- Specify Mongoose schemas with field types, required constraints, validators, and default values.
- Declare collection indexes for query performance (e.g., `{ userId: 1, createdAt: -1 }`).
- Define schema lifecycle hooks (specifically **single-point password hashing** via `pre('save')` on the `User` schema) and instance methods (e.g., `user.comparePassword()`).
- Manage direct database persistence, mutations, and query execution for MongoDB (local or Atlas).

#### 8. Configuration Layer (`server/src/config/`)
- **Environment Management (`env.js`):** Centralizes and validates environment configuration on process startup. Loads `server/.env` via `dotenv` and halts startup if critical variables (`MONGODB_URI`, `JWT_SECRET`) are missing, unconfigured, or contain placeholder credentials. Validates `GEMINI_API_KEY` placeholder guards and exposes configuration options for Gemini (`geminiApiKey`, `geminiModel`).
- **Database Connection (`db.js`):** Encapsulates the Mongoose connection lifecycle (`connectDB`, `disconnectDB`, `getDbStatus`), ensuring connections are established prior to HTTP server binding, logging sanitized host metadata without credential leakage, and safely reporting connection states.
- **AI Client Configuration (`gemini.js`):** Configures and exports a cached singleton instance of the official Google GenAI JavaScript client (`GoogleGenAI` from `@google/genai`) and resolves the model identifier from `GEMINI_MODEL` (defaulting to `gemini-3.5-flash-lite`). Avoids creating separate client instances per request and isolates provider initialization.

### 2.2 Server Directory Layout
```
server/
├── src/
│   ├── config/
│   │   ├── env.js         # Validated environment configuration (MongoDB, JWT, Gemini)
│   │   ├── db.js          # Mongoose connection & lifecycle
│   │   └── gemini.js      # Reusable GoogleGenAI singleton & model configuration
│   ├── controllers/       # HTTP request coordinators
│   │   ├── authController.js # Registration, login, logout & profile handlers
│   │   └── tripController.js # Trip creation & management handlers
│   ├── models/            # Mongoose schemas & data models
│   │   ├── Trip.js        # Trip model with embedded itinerary & budget breakdown
│   │   └── User.js        # User model with single-point bcrypt hashing
│   ├── routes/            # Route declarations & endpoint binding
│   │   ├── auth.routes.js # POST /register, POST /login, POST /logout, GET /me
│   │   ├── health.routes.js # GET /api/health endpoint
│   │   └── trip.routes.js # GET/POST /api/trips, GET/PATCH/DELETE /api/trips/:id
│   ├── middleware/        # Auth guards, validation, error handlers
│   │   └── authMiddleware.js # HttpOnly cookie JWT verification & req.user guard
│   ├── schemas/           # Structured response & JSON schema contracts
│   │   └── itinerarySchema.js # Gemini & standard JSON schemas for AI itinerary generation
│   ├── scripts/           # Standalone diagnostic & administrative scripts
│   │   └── verifyGemini.js # Diagnostic CLI smoke test for Gemini API connectivity
│   ├── services/          # Domain services & business logic
│   │   ├── aiService.js   # Gemini API mediation, error normalization & connectivity test
│   │   ├── authService.js # Registration, login & profile domain logic
│   │   └── tripService.js # Trip creation, retrieval, update, delete & domain operations
│   ├── validators/        # Input validation schemas
│   │   ├── authValidator.js # Registration & login payload validation
│   │   └── tripValidator.js # Trip creation, query, param & update validation
│   ├── utils/             # Shared server utilities
│   │   └── token.js       # JWT generation, verification & expiration constants
│   └── app.js             # Express application configuration & middleware
├── server.js              # Server entry point & process lifecycle
├── .env                   # Local secrets (excluded from Git)
├── .env.example           # Sanitized environment template
└── .gitignore             # Server Git exclusion rules
```

---

## 3. Database Architecture (MongoDB & Mongoose)

### 3.1 Collections vs. Embedded Subdocuments

TripMind distinguishes between **independent top-level collections** and **embedded subdocuments** to balance query speed, atomic consistency, and schema simplicity:

- **Independent MongoDB Collections:**
  - `users`: Stores user accounts, hashed credentials, and profile timestamps.
  - `trips`: Stores trip metadata, settings, and references the owning user via `userId` (`type: mongoose.Schema.Types.ObjectId, ref: 'User'`).
- **Embedded Subdocuments (inside `trips` collection for MVP):**
  - `ItineraryDay`: Embedded array within the `Trip` document representing sequential travel days.
  - `Activity`: Embedded array within each `ItineraryDay` representing scheduled events, stops, and activities.
  - `BudgetSummary`: Embedded subdocument within the `Trip` document aggregating estimated costs, actual spend, and categorical breakdowns.

### 3.2 Document Schema & Entity Relationship Diagram

```mermaid
erDiagram
    USER_COLLECTION ||--o{ TRIP_COLLECTION : "references (userId)"
    TRIP_COLLECTION ||--o{ ITINERARY_DAY_EMBEDDED : "embeds array (days)"
    ITINERARY_DAY_EMBEDDED ||--o{ ACTIVITY_EMBEDDED : "embeds array (activities)"
    TRIP_COLLECTION ||--o| BUDGET_SUMMARY_EMBEDDED : "embeds subdocument (budgetSummary)"

    USER_COLLECTION {
        ObjectId _id PK "Collection: users"
        string name
        string email UK
        string password "bcrypt hash, select: false"
        string role "user | admin"
        date createdAt
        date updatedAt
    }

    TRIP_COLLECTION {
        ObjectId _id PK "Collection: trips"
        ObjectId userId FK "ref: users collection, indexed"
        string startingLocation
        string destination
        string title
        date departureDate "alias: startDate"
        date returnDate "alias: endDate"
        number budget "alias: totalBudget"
        number numberOfTravellers "alias: travellers"
        string currency "USD"
        string coverImageUrl
        string status "draft | upcoming | completed"
        array interests
        object travelPreferences
        array days "alias: itinerary"
        object budgetSummary "alias: budgetBreakdown"
        date createdAt
        date updatedAt
    }

    ITINERARY_DAY_EMBEDDED {
        ObjectId _id PK "Embedded in Trip.days"
        number dayNumber
        date date
        string theme
        string notes
        array activities "Embedded in day.activities"
    }

    ACTIVITY_EMBEDDED {
        ObjectId _id PK "Embedded in day.activities"
        string title
        string description
        string timeSlot "morning | afternoon | evening | night"
        string time
        string locationName
        number latitude
        number longitude
        number estimatedCost
        string category "stay | food | transit | activity | other"
    }

    BUDGET_SUMMARY_EMBEDDED {
        number totalEstimated "Embedded in Trip.budgetSummary"
        number totalSpent
        number remaining
        object categories "alias: categoryBreakdown"
    }
```

### 3.3 Deletion Mechanics & Embedded Lifecycle
1. **Atomic Document Deletion:** Because `days`, `activities`, and `budgetSummary` reside physically inside the `Trip` document as embedded subdocuments, deleting a `Trip` document removes all associated itinerary and budget data in a single, atomic MongoDB operation.
2. **No Multi-Collection Cascades:** Unlike relational databases that require cascade triggers or foreign key cascades across multiple tables, TripMind's document model eliminates cascading operations and guarantees zero orphaned records upon trip deletion.
3. **Data Volume Fit:** A typical itinerary spans 1 to 30 days with 3 to 6 activities per day, easily remaining well under MongoDB's 16MB document size limit.

### 3.4 Concurrency-Safe Partial Updates & Nested Subdocument Preservation
1. **Conditional Atomic Query Invariants:** To guard against Time-of-Check to Time-of-Use (TOCTOU) race conditions during partial date updates, single-date updates embed counterpart date conditions directly into the atomic `findOneAndUpdate` query filter:
   - Updating `departureDate` only: requires `returnDate: { $gt: newDepartureDate }`.
   - Updating `returnDate` only: requires `departureDate: { $lt: newReturnDate }`.
   Under concurrent opposing requests, MongoDB document-level write locks serialize operations so at most one succeeds, guaranteeing that inverted date ranges can never be persisted.
2. **Dot-Notation Path Updates for Embedded Subdocuments:** Partial updates to `travelPreferences` are flattened into dot-notation paths (`'travelPreferences.pace'`, etc.) before applying `$set`. This preserves unmentioned sibling subdocument fields (`accommodationType`, `transportation`, `dietary`, `notes`) without full-object replacement.
3. **Array Ceilings:** To prevent unbounded document growth, `interests` is capped at 30 items and `travelPreferences.dietary` is capped at 20 items at both the request validator and Mongoose schema levels.

### 3.5 Itinerary Activity Modification Architecture (Day 32)
1. **Endpoint Specification:** `PATCH /api/trips/:tripId/days/:dayId/activities/:activityId`
2. **Identification Strategy:**
   - Both `itineraryDaySchema` and `activitySchema` are embedded subdocuments with `{ _id: true }` enabled in `server/src/models/Trip.js`.
   - Mongoose automatically assigns stable, globally unique 24-character hexadecimal `_id` ObjectIds upon itinerary creation.
   - Subdocuments are addressed directly using Mongoose subdocument methods: `trip.days.id(dayId)` and `day.activities.id(activityId)`.
3. **Anti-Enumeration Ownership Model:**
   - Authorization is enforced at the database query level: `Trip.findOne({ _id: tripId, userId: user._id })`.
   - If an unauthorized user attempts to query or modify an activity belonging to another traveler's trip, the query yields `null`, returning HTTP 404 `NOT_FOUND` (identical to non-existent trips), entirely eliminating ID enumeration or scanning attack vectors.
4. **Partial Subdocument Update Behavior:**
   - Request payloads are validated by `validateUpdateActivity` in `server/src/validators/activityValidator.js`.
   - Protected fields (`_id`, `userId`, `tripId`, `dayId`, `activityId`, `createdAt`, `updatedAt`, `__v`) and arbitrary unrecognized keys are rejected with HTTP 400 `VALIDATION_ERROR`.
   - Permitted fields (`title`, `name`, `description`, `timeSlot`, `time`, `duration`, `locationName`, `category`, `estimatedCost`, `costBreakdown`, `latitude`, `longitude`) are partially applied to the target activity subdocument.
   - Unsupplied fields are strictly preserved in their existing state.
   - The embedded `activity.location` subdocument (`name`, `latitude`, `longitude`) is synchronized automatically with `locationName` and provided coordinates.
5. **Dynamic Budget Summary Recalculation:**
   - If `estimatedCost` or `category` is modified, `updateTripActivity` in `server/src/services/tripService.js` delegates to `recalculateTripBudgetSummary(trip)` across all days within the trip to recalculate:
     - `trip.budgetSummary.totalEstimated`: sum of all activities' `estimatedCost`.
     - `trip.budgetSummary.remaining`: `Math.max(0, trip.budget - totalEstimated)`.
     - `trip.budgetSummary.categories`: re-tallied per category (`accommodation`, `food`, `transportation`, `activities`, `localTransport`, `miscellaneous`).
   - The updated document is persisted via `await trip.save()` and returned in the standardized response envelope `{ success: true, data: { activity, trip }, message }`.

### 3.6 Itinerary Activity Creation & Deletion Architecture (Day 33)
1. **Endpoint Specifications:**
   - Add Activity: `POST /api/trips/:tripId/days/:dayId/activities`
   - Remove Activity: `DELETE /api/trips/:tripId/days/:dayId/activities/:activityId`
2. **Identification & Subdocument Addressing:**
   - Parameter validation enforces 24-character hexadecimal ObjectIds (`validateDayParams` and `validateActivityParams`).
   - Target day is located using Mongoose subdocument helper: `const day = trip.days.id(dayId)`.
   - For deletion, target activity is located using `const activity = day.activities.id(activityId)`.
3. **Subdocument Array Mutation Mechanics:**
   - **Adding an Activity:** `day.activities.push(activityData)` creates a new embedded subdocument with a unique Mongoose-generated `_id` ObjectId. Sibling activities within the day and all other days remain untouched.
   - **Removing an Activity:** `day.activities.pull({ _id: activity._id })` performs an atomic in-memory subdocument removal targeting the unique ObjectId. Sibling activities in the array are preserved without re-indexing artifacts.
4. **Validation & Protection:**
   - Add activity payload is sanitized via `validateAddActivity`.
   - Title is strictly required and non-empty.
   - Client-supplied protected keys (`_id`, `userId`, `tripId`, `dayId`, etc.) and unrecognized fields are rejected with HTTP 400.
   - Validates category (`stay`, `food`, `transit`, `activity`, `other`) and timeSlot (`morning`, `afternoon`, `evening`, `night`) enums.
   - Enforces non-negative `estimatedCost` and coordinate mutual nullability.
5. **Centralized Financial Recalculation:**
   - All mutations delegate to `recalculateTripBudgetSummary(trip)` before `await trip.save()`.
   - Handles edge cases:
     - Zero activities: `totalEstimated: 0`, `remaining: trip.budget`, all category totals reset to `0`.
     - Over-budget: `remaining: Math.max(0, trip.budget - totalEstimated)` clamped safely to `0`.
6. **Frontend Integration:**
   - `AddActivityModal.jsx`: accessible modal dialog with field validation, category pills, and duplicate submission locking.
   - `DeleteActivityModal.jsx`: accessible alertdialog (`role="alertdialog"`) with explicit confirmation details and loading indicators.
   - `TripDetailPage.jsx`: updates local React state and synchronizes `TripContext` without page reloads.

### 3.7 Budget Calculation Service Architecture (Day 34 & Pre-Day 35 Integration)
1. **Centralized Service Isolation:**
   - All budget calculation logic is consolidated inside `server/src/services/budgetService.js` and re-exported through `tripService.js`.
   - Strictly decoupled from Express `req`/`res` objects, enabling pure unit testing and eliminating code duplication.
   - Provides pure domain calculation functions: `calculateTripBudget`, `recalculateTripBudgetSummary`, `calculateAIBudgetSummary`, `roundCurrency`, and `normalizeActivityCategory`.
2. **Authoritative Calculation Formulas:**
   - **Total Estimated Cost:** $\sum \text{activity.estimatedCost}$ across all days and activities. Only finite positive numbers are summed; invalid, negative, NaN, or non-numeric inputs are discarded.
   - **Remaining Budget:** $\max(0, \text{trip.budget} - \text{totalEstimated})$. Clamped to 0 in over-budget scenarios.
   - **Per-Person Cost:** $\text{totalEstimated} / \max(1, \text{trip.numberOfTravellers})$. Safely handles 0, missing, or negative traveller counts without `Infinity` or `NaN`.
   - **Budget Utilization (%):** $(\text{totalEstimated} / \text{trip.budget}) \times 100$ when $\text{trip.budget} > 0$, otherwise $0\%$.
   - **Financial Rounding:** All currency amounts are rounded using `roundCurrency(val) = Math.round((val + Number.EPSILON) * 100) / 100` to eliminate IEEE-754 precision drift.
3. **Category Architecture & Reconciliation:**
   - **Two-Tier Category Paradigm:**
     - **Activity-Level Categories (5 enums):** `stay`, `food`, `transit`, `activity`, `other` (defined in `activitySchema` in `Trip.js` and enforced by `activityValidator.js`).
     - **Budget Summary Categories (6 canonical keys):** `accommodation`, `food`, `transportation`, `activities`, `localTransport`, `miscellaneous`.
   - **Mapping Rules:**
     - `stay` $\rightarrow$ `accommodation`
     - `food` $\rightarrow$ `food`
     - `transit` $\rightarrow$ `transportation` (scheduled transit stops, flights, and long-distance trains)
     - `activity` $\rightarrow$ `activities`
     - `other` $\rightarrow$ `miscellaneous`
   - **Local Transport Architecture:** `localTransport` in `budgetSummary` represents an AI-generated macro allocation for unitemized city transit passes (IC cards, metro tokens, local taxis). Activity-level transit items use `transit` and map to `transportation`. The activity enum is strictly preserved (5 enums).
   - **Canonical Day 35 Chart Consumption Contract:**
     - `BUDGET_CATEGORIES = ['accommodation', 'food', 'transportation', 'activities', 'localTransport', 'miscellaneous']`.
     - An `other` key is attached to `categories` solely as a backward-compatibility alias mirroring `miscellaneous`.
     - Day 35 Recharts visualizations must consume the canonical 6-item `BUDGET_CATEGORIES` (or `CATEGORY_CONFIG`) and must **never** enumerate `Object.keys(categories)` or `Object.entries(categories)` to prevent duplicate slices or double-counting.
   - $\sum_{c \in \text{BUDGET\_CATEGORIES}} c \equiv \text{totalEstimated}$ is strictly guaranteed.
   - `costBreakdown` is treated as a narrative editorial string and is never parsed or added to financial totals, preventing double-counting.
4. **AI Budget Initialization via `calculateAIBudgetSummary`:**
   - In `saveTripItinerary()`, raw AI-generated allocations and activity costs are treated strictly as inputs.
   - `totalEstimated` is derived authoritatively: if category breakdown is supplied, `totalEstimated = \sum \text{categories}`. If empty or zero, falls back to summing scheduled activity costs across days.
   - AI-supplied `itineraryData.budget.totalEstimated` is never trusted blindly and cannot override calculated totals.
   - Safely computes `remaining`, `perPersonCost`, and `budgetUtilization`.
   - The traveler's original `trip.budget` target is strictly read-only and preserved in MongoDB.
5. **Subdocument Persistence & Frontend Sync:**
   - Extended `budgetSummarySchema` in `server/src/models/Trip.js` with `perPersonCost` and `budgetUtilization`.
   - `BudgetBreakdown.jsx` consumes the authoritative backend metrics to display total estimated, target comparison, per-person costs, and utilization percentage.

### 3.8 Itinerary Retrieval & Query Optimization Architecture (Day 31 Reconciliation)
1. **Endpoint Specification:** `GET /api/trips/:id`
2. **Complete Request-Response Lifecycle:**
   - **Client Detail View (`TripDetailPage.jsx`):** Dispatches `loadTrip()` on mount or `:id` route change.
   - **API Client Layer (`tripApi.js`):** Invokes `getTrip(id)` via Axios instance with HttpOnly cookie credentials.
   - **Routing & Middleware Chain (`trip.routes.js`):**
     - `authenticateToken`: Verifies JWT cookie, extracts subject identifier, attaches trusted `req.user = { id: decoded.sub }`.
     - `validateTripId`: Inspects `req.params.id` using Mongoose `isValidObjectId()`. Rejects non-hex/malformed IDs with HTTP 400 `INVALID_ID` before any database roundtrip.
   - **Controller (`tripController.js`):** `getTripById` extracts sanitized `userId` and `tripId`, delegates to domain service, and wraps results in the standardized API envelope `{ success: true, data: { trip }, message: "Trip retrieved successfully" }`.
   - **Domain Service (`tripService.js`):** `getTripById(userId, tripId)` executes database query with compound owner filter: `Trip.findOne({ _id: tripId, userId: user._id })`.
3. **Ownership Protection & Anti-Enumeration Defense:**
   - Multi-tenant isolation is enforced at the database query level via `userId: user._id`.
   - Cross-user access attempts (User A requesting User B's valid `tripId`) return `null` from MongoDB.
   - The controller translates `null` directly into HTTP 404 `NOT_FOUND` ("Trip not found"), identical to queries for non-existent IDs.
   - This prevents ID enumeration attacks, leaking neither the existence of private itineraries nor user ID associations.
4. **Mongoose Population vs. Embedded Subdocuments:**
   - **Architectural Fit:** Days (`itineraryDaySchema`) and activities (`activitySchema`) are embedded subdocuments stored directly inside the BSON document of the `Trip` model (`server/src/models/Trip.js`).
   - **Why `populate()` is Not Used:** Mongoose `populate()` is explicitly designed for referenced documents across foreign collections (such as `userId` referencing `User`). Invoking `populate()` on embedded subdocuments is an architectural antipattern that causes schema lookup errors in Mongoose.
   - **Single Atomic Read:** In MongoDB, an entire embedded document hierarchy is read in a single sequential disk block operation ($O(1)$ disk seek). Normalizing days and activities into separate collections to enable `populate()` would require 2–3 database roundtrips or `$lookup` aggregation joins, adding significant latency, connection overhead, and transaction complexity.
5. **Index Selectivity & Query Optimization Findings:**
   - **Primary Key Point Lookup:** `Trip.findOne({ _id: tripId, userId: user._id })` leverages the unique primary key index `_id_`.
   - **Explain Diagnostics (`executionStats`):** Execution plan uses stage `FETCH` with index scan `IXSCAN` on `_id_`:
     - `totalKeysExamined: 1`
     - `totalDocsExamined: 1`
     - `executionTimeMillis: 0 ms`
   - **Index Selectivity:** The `_id` index is uniquely selective (cardinality 1:1). Evaluating the in-memory `userId` predicate on the single retrieved document occurs in 0 ms.
   - **Compound Index Coverage:** The existing compound index `{ userId: 1, createdAt: -1 }` covers multi-trip dashboard listing and pagination. Introducing an additional compound index `{ _id: 1, userId: 1 }` would be redundant overhead since `_id` alone provides maximal selectivity.
   - **`.lean()` Evaluation:** For a typical 5–25 KB trip document, Mongoose hydration overhead is negligible (<1 ms). Keeping standard Mongoose hydration preserves document methods, subdocument casting, and critical schema virtual aliases (`startDate`, `endDate`, `totalBudget`, `travellers`).

---

## 4. Frontend Architecture (React + Vite + Tailwind CSS v4)

### 4.1 Component Structure & Modularity
```
client/src/
├── assets/             # Brand assets, icons, typography files
├── components/
│   ├── common/         # Generic UI primitives: Button, Input, Modal, Card, Badge
│   ├── layout/         # Shell, Navbar, Footer, Sidebar, PageContainer
│   ├── itinerary/      # DaySelector, ActivityTimeline, ActivityCard, AddActivityModal, EditActivityModal, DeleteActivityModal, BudgetBreakdown
│   ├── budget/         # ExpenseDonutChart, BudgetComparisonChart, constants
│   ├── map/            # LeafletMapContainer, ActivityMarker, BoundsController
│   └── discovery/      # DestinationCard, DestinationGrid, FilterPills
├── context/            # AuthContext, TripContext (cross-cutting application state)
├── hooks/              # Custom hooks: useAuth, useTrip, useLeafletMap
├── pages/              # Route views: LandingPage, LoginPage, RegisterPage, Dashboard, TripDetailPage
├── services/
│   └── api/            # Standardized Axios API clients:
│       ├── apiClient.js    # Base Axios instance, interceptors, error mapping
│       ├── authApi.js      # Authentication endpoints (login, register, logout)
│       ├── tripApi.js      # Trip CRUD endpoints
│       └── aiApi.js        # AI itinerary generation endpoint
├── index.css           # Tailwind CSS v4 @import "tailwindcss" and @theme declarations
└── utils/              # Formatting helpers, date math, currency tools, validators
```

### 4.2 API Client Layer (`client/src/services/api/`)
All backend network calls must be routed through dedicated API modules in `client/src/services/api/`:
- **`apiClient.js`:** Exports the configured Axios instance with base URL, timeout configurations, and request/response interceptors.
- **Credential Handling:** The request interceptor handles authentication credentials based on the finalized token strategy (attaching Authorization header or configuring cookie credentials).
- Components and pages must never call raw `fetch` or instantiate isolated `axios` instances.

### 4.3 Trip State Management & Modal Integration (`TripContext`, `CreateTripModal`, `EditTripModal` & `DeleteTripModal`)
- **`TripContext` (`client/src/context/TripContext.jsx`):** Encapsulates shared trip state (`trips`, `pagination`, `loading`, `error`, `isCreating`, `isUpdating`, `isDeleting`) and domain actions (`fetchTrips`, `createTrip`, `updateTrip`, `deleteTrip`). Placed at the narrowest appropriate route boundary (`<ProtectedRoute><TripProvider><DashboardPage /></TripProvider></ProtectedRoute>`).
- **Race Condition & Duplicate Submission Prevention:** Uses a mutable request identifier ref (`latestFetchRequestId`) to silently discard out-of-order asynchronous responses if a newer fetch is dispatched. State guards `isCreating`, `isUpdating`, and `isDeleting` block concurrent duplicate submissions.
- **Immediate State Synchronization:**
  - **Trip Creation:** Prepending newly created trip document to in-memory `trips` state array, sliced to active `pagination.limit`, with recalculated `totalTrips` and `totalPages` without requiring a full page reload or redundant roundtrip.
  - **Trip Updates:** When `updateTrip` resolves successfully with the server-confirmed updated trip document, `TripContext` updates the matching item in `trips` in place (`(trip._id === id || trip.id === id) ? updatedTrip : trip`), preserving array order, pagination metadata, and sibling trips without refreshing the entire dashboard.
  - **Trip Deletion:** When `deleteTrip` resolves successfully (`{ success: true, data: null }`), `TripContext` removes the targeted trip from `trips` in-memory, decrements `totalTrips`, and recalculates `totalPages`. If the deleted trip was the last item on a page greater than 1, `TripContext` automatically transitions to the previous page and re-fetches to prevent stranding on an empty page. If deletion fails, in-memory state remains untouched.
- **Controlled Modal Forms & Dialogs:**
  - **`CreateTripModal.jsx`:** 3-step guided wizard + review capturing required and optional fields with step-by-step validation.
  - **`EditTripModal.jsx`:** Tabbed editorial editing interface (`Trip Basics`, `Budget & Party`, `Preferences & Style`) prepopulating existing values (converting ISO dates to `YYYY-MM-DD` inputs). Calculates client-side diff deltas to send partial updates containing only modified fields to `PATCH /api/trips/:id`. Preserves all entered values upon submission failure and directs the traveler to the earliest tab containing validation errors.
  - **`DeleteTripModal.jsx`:** Accessible confirmation dialog (`role="alertdialog"`) explicitly identifying the destination, origin, dates, and budget of the targeted trip. Warns of permanent subdocument eradication, focuses the Cancel action by default to prevent accidental deletion, displays an inline error banner if deletion fails, and prevents double-submissions during deletion.

### 4.4 Budget Visualizations Architecture (Day 35 Recharts Integration)
- **Component Modularity (`client/src/components/budget/`):**
  - **`ExpenseDonutChart.jsx`:** Renders a responsive Recharts donut visualization (`ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `Tooltip`) partitioning expenditure across the 6 canonical categories. Centered summary pill indicates total estimated spending. Custom tooltip formats currency and category proportions.
  - **`BudgetComparisonChart.jsx`:** Renders a responsive Recharts horizontal bar chart (`ResponsiveContainer`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `Cell`) comparing Target Budget, Total Estimated Expenses, and Remaining Buffer. Automatically adapts to over-budget scenarios, turns the estimated bar into Burnt Crimson (`#B33A3A`), and displays an over-budget headroom alert.
  - **`constants.js`:** Encapsulates the canonical category contracts (`CANONICAL_BUDGET_CATEGORIES`), standard currency formatter (`formatCurrency`), and pure data transformation pipelines (`transformCategoryChartData`, `transformComparisonChartData`).
- **Data Invariant Discipline:**
  - Strictly maps over `CANONICAL_BUDGET_CATEGORIES` (6 items). Never iterates over raw `Object.keys(categories)` or `Object.entries(categories)`.
  - The legacy `other` alias is strictly omitted from chart data, guaranteeing zero double-counting.
  - All authoritative financial figures (`totalEstimated`, `remaining`, `budgetUtilization`) are derived from the backend Mongoose model (`trip.budgetSummary`) and are never recalculated client-side.
- **Accessibility & Responsiveness:**
  - Accompanied by hidden semantic screen-reader summary lists (`sr-only`) and ARIA region roles (`role="region"`).
  - Clean responsive grid layout (`grid-cols-1 lg:grid-cols-2`) embedded seamlessly within `BudgetBreakdown.jsx` above the 6-category cards, adapting smoothly across mobile (375px), tablet (768px), and desktop (1280px+) screens.

---

## 5. Security & Authentication Architecture

### 5.1 Authentication Strategy & Token Storage (Confirmed ADR-010)
TripMind utilizes JWT for stateless authentication and `bcrypt` for salted password hashing. Per **ADR-010** (resolved from `Pending-002`), access tokens are stored strictly in an **`HttpOnly`** cookie.

#### Security Architecture:
- **HttpOnly, Secure Cookies (`token`):**
  - **XSS Mitigation:** Complete resistance. JavaScript cannot access or read `document.cookie`, preventing token exfiltration via client-side injection flaws or compromised dependencies.
  - **CSRF Defense:** Mitigated via `SameSite=Lax` in development and single-origin deployments. CORS policy strictly limits credentials to `config.clientUrl` (wildcards prohibited). For cross-site production topologies (`SameSite=None`), explicit anti-CSRF token verification is required prior to public launch.
  - **Transmission Discipline:** JWT is delivered exclusively in the `Set-Cookie` header; the JSON response body contains only safe user metadata.
  - **Token Expiration:** Short-lived access tokens (15 minutes). Refresh-token rotation and active blacklisting are deferred to post-MVP.

### 5.2 Single-Point Password Hashing Rule
- Password hashing is encapsulated exclusively in the Mongoose `User` schema `pre('save')` hook (`server/src/models/User.js`).
- The hook checks `if (!this.isModified('password')) return next();` and hashes the plain password using `bcrypt` (10 salt rounds).
- Domain services (`server/src/services/authService.js`) pass the raw, validated password directly to `User.create()`. Services are strictly prohibited from pre-hashing passwords, eliminating the risk of double-hashing.
- Password verification during login uses the schema method `user.comparePassword(candidatePassword)` which delegates to `bcrypt.compare`.

### 5.3 Stateless Logout vs. Server-Side Revocation
- **Stateless Logout (MVP):** For the MVP, logging out is achieved on the client side by clearing the stored authentication credential or clearing the authentication cookie via `res.clearCookie()`.
- **Server-Side Revocation (Deferred):** Active server-side token revocation (such as Redis-backed token blacklists or short-lived token rotation) is explicitly deferred beyond the MVP.

### 5.4 AI & External Service Isolation (ADR-003, ADR-012, ADR-013 & ADR-014)
- **Zero Credential Exposure:** Google Gemini API keys reside strictly on the server (`server/.env` under `GEMINI_API_KEY`). They are never exposed via Vite environment variables, client bundles, network payloads, or logs.
- **Provider & SDK Configuration:** Standardized on official `@google/genai` (v3.6.1+) SDK with free-tier model `gemini-3.5-flash-lite` (configurable via `GEMINI_MODEL`).
- **Singleton Client Architecture:** `server/src/config/gemini.js` maintains a cached `GoogleGenAI` client singleton, avoiding client churn and memory leaks.
- **Service-Layer Mediation (`server/src/services/aiService.js`):** Client components and controllers never communicate directly with Gemini. `aiService.js` normalizes provider error responses into standardized error codes (`GEMINI_AUTH_FAILED`, `GEMINI_MODEL_NOT_FOUND`, `GEMINI_QUOTA_EXCEEDED`, `GEMINI_NETWORK_ERROR`, `GEMINI_SERVICE_UNAVAILABLE`, `GEMINI_EMPTY_RESPONSE`, `GEMINI_PARSE_ERROR`, `INVALID_TRIP_CONTEXT`).
- **System Prompt Engineering & Context Injection:** `aiService.js` exports `SYSTEM_INSTRUCTION` establishing Gemini's role as TripMind's expert travel curator. It extracts real `Trip` model fields via `buildTripContext(tripData)` (supporting Mongoose documents and plain objects with alias resolution, 1–30 days duration validation rejecting out-of-range or inconsistent values, 30-item interest ceiling, and 20-item dietary ceiling), and constructs a structured user prompt via `buildItineraryUserPrompt(tripContext)` enforcing geographic clustering, 2–8 activities per day, sequential calendar dates, and party-level budgets.
- **Structured Output Schema Contract (`server/src/schemas/itinerarySchema.js`):** AI generation requests configure `config: { responseMimeType: 'application/json', responseSchema: geminiItinerarySchema, systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 }`. This forces Gemini's constrained decoding grammar to output strictly valid JSON conforming to TripMind's domain requirements (`destination`, `summary`, `travelTips`, `budget` categories, and contiguous `days` with 2–8 structured `activities` per day, 12-hour AM/PM time formats, and mutually dependent nullable coordinates).
  - **Two-Tier Validation Strategy:**
    - **Tier 1 (Structural Validation):** Schema typing enforces syntax, 12-hour AM/PM time formats, daily activity boundaries (2–8), and structural types at generation time via `validateItineraryStructure()` (`server/src/schemas/itinerarySchema.js`).
    - **Tier 2 (Domain Semantic Validation):** Enforced via `validateItinerarySemantic()` in a dedicated validator module (`server/src/validators/itineraryValidator.js`). Validates destination consistency via deterministic segment/token matching (`areDestinationsConsistent`), calendar day duration matching (1–30 days), contiguous sequential day numbering starting at 1, departure date matching Day 1, non-exceeding return dates, exact currency matching (`trip.currency`), mathematical budget reconciliation (`totalEstimated == sum(categories)`), itemized activity costs vs allocated food/activities categories, double-counting prevention (ignoring `costBreakdown` strings in arithmetic sums), and mutual WGS84 coordinate nullability.
    - **Composite Validator:** `validateTripItinerary(itinerary, trip)` composes Tier 1 and Tier 2 validations. Semantic failures reject persistence with HTTP 422 `ITINERARY_VALIDATION_FAILED` and structured details without invoking Gemini retries.
  - **Atomic MongoDB Persistence (`tripService.saveTripItinerary`):**
    - Persists validated itineraries directly into MongoDB using an atomic `Trip.findOneAndUpdate({ _id: tripId, userId: user._id }, ...)` update.
    - Saves mapped `days`, `budgetSummary` (including all 6 categories: `transportation`, `accommodation`, `food`, `activities`, `localTransport`, `miscellaneous`), editorial `summary`, and `travelTips`.
    - Guarantees original trip attributes (`departureDate`, `returnDate`, `destination`, `startingLocation`, `budget`, `currency`, `numberOfTravellers`) remain strictly immutable.
    - **Regeneration Policy:** Authenticated owners may regenerate itineraries; existing saved itineraries in MongoDB are preserved completely if generation or validation fails.
  - **₹0 Budget & Cost Safeguards:** All requests operate strictly within Google AI Studio's free tier. Grounding tools (Google Search, Maps grounding) and automatic retries are disabled to prevent quota burn.
  - **Diagnostic Verification Method:** Minimal smoke test `verifyGeminiConnection()` sends a synthetic prompt (`"Reply with exactly: TripMind Gemini connection successful."`) to verify credentials and model accessibility without creating unauthenticated public testing endpoints.
  - **Itinerary Generation & Persistence REST API (`POST /api/trips/:id/generate-itinerary`):**
    - **Routing & Controller:** Implemented in `server/src/routes/trip.routes.js` and `server/src/controllers/tripController.js`, maintaining architectural cohesion within the existing `/api/trips` resource hierarchy without introducing premature disjoint route files.
    - **Security & Ownership Enforcement:** Protected by `authenticateToken` middleware (extracting verified identity from HttpOnly JWT cookie) and `validateTripId` (enforcing MongoDB ObjectId format). The controller delegates retrieval to `tripService.getTripById(userId, tripId)` enforcing ownership at the database query level (`_id: tripId, userId: user._id`). Unowned or non-existent trips return identical HTTP 404 `NOT_FOUND` responses (`"Trip not found"`), preventing resource enumeration attacks.
    - **Execution Order & Quota Protection:** `generateItinerary(trip)` is invoked strictly after authentication and ownership verification succeed. Unauthorized, malformed, or non-existent requests trigger 0 Gemini API calls.
    - **HTTP Status Code Mapping:**
      - `INVALID_TRIP_CONTEXT` -> `400 Bad Request`
      - `ITINERARY_VALIDATION_FAILED` -> `422 Unprocessable Entity`
      - `GEMINI_QUOTA_EXCEEDED` -> `429 Too Many Requests`
      - `GEMINI_SERVICE_UNAVAILABLE` -> `503 Service Unavailable`
      - `GEMINI_AUTH_FAILED`, `GEMINI_NETWORK_ERROR`, `GEMINI_EMPTY_RESPONSE`, `GEMINI_PARSE_ERROR` -> `502 Bad Gateway`
      - `GEMINI_CONFIG_ERROR`, `PERSISTENCE_FAILED` / internal -> `500 Internal Server Error`
    - **Success Envelope:** Returns HTTP 200 with `{ success: true, data: { tripId, itinerary, meta }, message: "Itinerary generated and saved successfully." }`. Optional `?persist=false` query parameter supports preview generation without database mutation.

---

## 6. Mapping Architecture & OpenStreetMap Policies

### 6.1 Roles of Leaflet and OpenStreetMap
- **Leaflet:** The client-side JavaScript map rendering library responsible for rendering interactive map controls, pan/zoom viewports, markers, and popup overlays.
- **OpenStreetMap (OSM):** The collaborative project providing the underlying geographic map data and raster tile imagery.

### 6.2 Tile Usage Policy & Attribution Requirements
Public standard tile servers (`tile.openstreetmap.org`) are operated entirely on donated resources by the OpenStreetMap Foundation. They **do not guarantee high availability or unlimited free usage for production applications**.

The TripMind mapping integration must adhere strictly to the following requirements:
1. **Mandatory Attribution:** Every map instance must prominently display the required attribution notice: `© OpenStreetMap contributors`.
2. **Browser Environment & Tile Requests:**
   - Web browsers strictly prohibit client-side JavaScript from modifying the `User-Agent` HTTP header for tile image requests (Fetch/XHR/`<img>`). Browser tile requests rely on standard browser header propagation (`Referer` and `Origin`).
   - Standard OSM tile servers are suitable for development, prototyping, and low-traffic MVP testing only.
   - Bulk downloading, heavy automated requests, or aggressive pre-fetching of tiles is strictly prohibited.
3. **Tile Caching:** Tile requests must be cached locally by the browser in accordance with HTTP cache control headers.
4. **Production Path:** If application usage grows beyond low-volume MVP limits, TripMind must transition to a dedicated tile provider (e.g., Stadia Maps, MapTiler, Protomaps) or deploy a self-hosted tile cache.

### 6.3 Separation of Geocoding
- **Geocoding** (converting text addresses or landmark names into latitude/longitude coordinates) is an independent technical problem from map rendering and tile serving.
- Geocoding technical options are evaluated separately in [`DECISIONS.md`](./DECISIONS.md) (`Pending-003`).

---

## 7. Standardized API Response Envelope

Every Express API endpoint must return JSON adhering to the following structure:

### 7.1 Success Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### 7.2 Error Format
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested trip was not found.",
    "details": []
  }
}
```

> **Consistency Rule:** The `details` field must always be an array. When specific validation errors are present, it contains an array of detail objects; when no additional detail is available, it must be standardized as an empty array `[]` (never `null` or undefined).
