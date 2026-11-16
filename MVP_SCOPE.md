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
  - Hero section featuring editorial headline, value statement, and primary CTA buttons ("Start Planning", "Explore Destinations").
  - Feature highlights section detailing AI planning, interactive maps, and budget tracking.
  - Interactive preview or visual mock of an editorial itinerary card adhering to the Warm Ivory and Forest Green palette.
  - Responsive navigation header with links to Login/Register and a clean footer with project information.
- **Current Status:** 🔴 Pending / Not Started

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
  - **Create:** Modal or form to define a new trip (Destination name, Start date, End date, Total budget, Cover image or preset tag).
  - **View:** Trip detail page displaying overview, dates, duration, total budget, and associated daily itineraries.
  - **Update:** Ability to edit trip metadata (dates, title, budget cap, notes).
  - **Delete:** Safe trip deletion with confirmation prompt; deleting the parent `Trip` document automatically and atomically removes its embedded days, activities, and budget summary without requiring multi-collection cascade operations.
  - Data isolation: Users can only view, update, or delete trips they own (`userId` check against authenticated user).
- **Current Status:** 🔴 Pending / Not Started

### 3.4 Stage 5: AI Itinerary Generation
- **Description:** Automated multi-day itinerary generation powered by an external LLM mediated through Express backend services (`server/src/services/aiService.js`).
- **Acceptance Criteria:**
  - Input prompt form collecting destination, travel dates, style/pace (e.g., relaxed, moderate, fast-paced), interests, and approximate budget tier.
  - Backend service constructs a prompt enforcing a strict JSON schema output.
  - Backend securely invokes the LLM API using server-side credentials and parses the response into days, activities, estimated costs, and coordinates.
  - Error handling for malformed LLM responses, rate limits, or network timeouts with standardized error envelope (`details: []`).
  - Generated itinerary is saved directly to MongoDB within the user's trip document as embedded subdocuments.
- **Current Status:** 🔴 Pending / Not Started

### 3.5 Stage 4: Editable Day-Wise Itinerary
- **Description:** Interactive, sequential day-by-day planner allowing granular customization.
- **Acceptance Criteria:**
  - Day selector tabs or accordion view (e.g., "Day 1", "Day 2", etc.).
  - Chronological activity list per day displaying time slot, title, description, location, estimated cost, and category tag.
  - User can add a new activity to any day.
  - User can edit activity details inline or via modal.
  - User can delete an activity from a day.
  - Changes persist to MongoDB via backend API endpoints (`client/src/services/api/tripApi.js`) mutating embedded subdocuments in `Trip`.
- **Current Status:** 🔴 Pending / Not Started

### 3.6 Stage 5: Budget Calculation & Breakdown
- **Description:** Transparent financial summary tracking expenses against the trip's defined budget.
- **Acceptance Criteria:**
  - Calculates total estimated expenses from all itinerary activities and stays.
  - Computes remaining budget or over-budget warning indicator.
  - Categorical expense breakdown (Accommodation, Dining, Transport, Activities, Miscellaneous).
  - Visual chart representation using **Recharts** (e.g., Donut or Bar chart) adhering to the editorial color palette.
- **Current Status:** 🔴 Pending / Not Started

### 3.7 Stage 4: Destination Discovery
- **Description:** Inspiration section allowing users to explore popular or trending destinations.
- **Acceptance Criteria:**
  - [x] Curated destination structure and responsive card grid (Kyoto, Swiss Alps, Bali, Manali, Varanasi, Amalfi Coast) with category insignia and narrative descriptions *(Part 1 Completed)*.
  - [x] Curated local destination photography in optimized WebP format with verified source and licensing attribution *(Part 2 Completed)*.
  - [x] Interactive category/vibe filter pills (All, Culture & Heritage, Mountain Escape, Tropical Escape, Adventure, Coastal Escape) with active state management and responsive wrapping *(Part 2 Completed)*.
  - [ ] "Plan a trip here" one-click action that pre-fills the Trip Creation / AI generation modal with the selected destination *(Deferred to Stage 4 Trip Creation workflow)*.
- **Current Status:** 🟡 Presentation Layer Completed (Part 1 & Part 2 Completed; Trip Creation pre-fill action pending Stage 4)

### 3.8 Stage 5: Interactive Map Integration
- **Description:** Geographic visualization of trip destinations and daily activities using Leaflet (rendering engine) and OpenStreetMap (map data & raster tiles).
- **Acceptance Criteria:**
  - Interactive map container embedded on the trip detail / itinerary view rendered using Leaflet.
  - OpenStreetMap raster tile layer with mandatory attribution notice: `© OpenStreetMap contributors`.
  - Adherence to OpenStreetMap Tile Usage Policy: relies on standard browser header propagation (`Referer`/`Origin`), local browser caching, and prohibits bulk downloading/scraping. (Browser JavaScript does not and cannot set custom `User-Agent` headers for tile image requests).
  - Markers placed for each daily activity with latitude/longitude coordinates.
  - Clicking a marker opens an editorial popup displaying activity title, time, and address/notes.
  - Map bounds automatically fit the coordinates of the selected day's activities.
- **Current Status:** 🔴 Pending / Not Started

### 3.9 Stage 4: Saved Trips (User Dashboard)
- **Description:** Centralized hub for managing all upcoming, past, and drafted journeys.
- **Acceptance Criteria:**
  - Dashboard view displaying cards for all trips owned by the authenticated user.
  - Categorization tabs or filters (e.g., "Upcoming", "Past", "All").
  - Quick action buttons on each card: "Open Itinerary", "Edit Details", "Delete".
  - Empty state with editorial styling guiding first-time users to create their initial trip.
- **Current Status:** 🔴 Pending / Not Started

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

- ❌ **AI Travel Assistant (Conversational Chatbot):** Persistent, multi-turn conversational chat assistant inside the itinerary view.
- ❌ **PDF Export:** Server-side or client-side PDF document generation.
- ❌ **Shareable Public Itineraries:** Public sharing links, read-only guest tokens, or social preview generation.
- ❌ **Flight & Hotel Booking Integrations:** Live booking APIs (e.g., Amadeus, Skyscanner, Booking.com).
- ❌ **Collaborative Planning:** Multi-user real-time editing via WebSockets or CRDTs.

---

## 6. Scope Boundary Matrix

| Feature / Capability | MVP Scope | Out of Scope |
| :--- | :---: | :---: |
| Single-user trip creation and editing | ✅ | |
| Structured AI-generated multi-day itinerary | ✅ | |
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
