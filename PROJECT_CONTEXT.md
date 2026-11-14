# TripMind — Project Context

> **Project Name:** TripMind  
> **Mission:** An AI-powered travel planning platform delivering a thoughtful, premium editorial travel experience.

---

## 1. Executive Summary & Purpose

Travel planning is notoriously fragmented. Travelers currently bounce between search engines, booking platforms, travel blogs, spreadsheets, and disconnected note apps. While generic conversational AI models can generate lists of attractions, they often fail to provide:
- **Geographical Coherence:** Grouping activities by logical physical proximity to minimize travel time.
- **Temporal Realism:** Pacing days realistically with time slots, transit buffers, and rest intervals.
- **Budget Accountability:** Linking activities and lodgings directly to itemized expense calculations.
- **Delightful Visual Orientation:** Offering map-based spatial awareness and an inspiring, editorial presentation.

**TripMind** solves these challenges by combining generative artificial intelligence with an intuitive, structured itinerary canvas. It transforms conversational travel aspirations into actionable, day-wise itineraries complete with interactive maps, itemized budgets, and destination discovery guides—all wrapped in a sophisticated, editorial travel magazine aesthetic.

---

## 2. Target Audience & Value Proposition

### 2.1 Target Audience
- **Independent Explorers:** Travelers who prefer tailored, authentic itineraries over rigid tour packages.
- **Budget-Conscious Planners:** Individuals and small groups who need clear fiscal visibility before and during travel.
- **Time-Constrained Planners:** Professionals seeking comprehensive, realistic travel plans generated in minutes rather than days.

### 2.2 Core Value Propositions
1. **Intelligent Automation:** Generate rich, multi-day itineraries in seconds using specialized backend LLM prompts.
2. **Total Flexibility:** Full CRUD control over generated itineraries—add, view, update, reorder, or remove days and activities.
3. **Spatial Clarity:** Visual map orientation powered by Leaflet map rendering and OpenStreetMap data/tiles to contextualize daily routes.
4. **Transparent Economics:** Real-time budget tracking and categorical expense breakdown powered by Recharts.
5. **Editorial Elegance:** A calm, tactile visual design that elevates planning into an enjoyable creative ritual rather than a stressful administrative chore.

---

## 3. Technology Stack Specification

| Domain | Technology | Rationale & Responsibility |
| :--- | :--- | :--- |
| **Frontend Framework** | **React (JavaScript)** | Component-driven architecture for rapid UI rendering, reactive state updates, and modular component hierarchy. |
| **Build Tool** | **Vite** | Modern, ultra-fast development server with Hot Module Replacement (HMR) and optimized production bundling. |
| **Styling** | **Tailwind CSS v4** | Utility-first CSS framework configured via CSS-first `@theme` declarations in `client/src/index.css` implementing TripMind's custom editorial palette and serif typography. |
| **Client Routing** | **React Router (v6+)** | Declarative client-side routing supporting public landing routes, protected auth routes, dynamic trip detail views (`/trips/:id`), and dashboard views. |
| **HTTP Client** | **Axios (`client/src/services/api/`)** | Centralized API client configured with request interceptors for authenticated API communication and unified response/error handling (`details: []`). |
| **Backend Runtime** | **Node.js** | Non-blocking, asynchronous runtime providing high performance for concurrent API and I/O requests. |
| **Web Framework** | **Express** | Minimalist REST API framework. Separated cleanly into `server/src/app.js` (middleware, routes, error handling) and `server/server.js` (application entry point, DB connection, and HTTP listener). |
| **Database** | **MongoDB (Local / Atlas)** | Scalable NoSQL database with independent `users` and `trips` collections. Supports local MongoDB (Compass) for development and MongoDB Atlas for cloud deployment. Itinerary days, activities, and budget summaries are embedded within the `Trip` document for MVP. |
| **ODM** | **Mongoose** | Schema modeling and database interface layer. Models define schemas and interact with MongoDB; services execute business logic and database operations through models; controllers coordinate HTTP requests/responses. |
| **Authentication** | **JWT & bcrypt** | Stateless authentication via signed JSON Web Tokens paired with salted password hashing (handled once in the Mongoose User `pre('save')` hook). Client token storage strategy (HttpOnly cookie vs. Bearer token) is evaluated in [`DECISIONS.md`](./DECISIONS.md) (`Pending-002`). Logout clears client credentials. |
| **AI Engine** | **LLM API Integration** | Backend-proxied Large Language Model API generating structured JSON itineraries based on destination, dates, budget, and travel preferences. |
| **Mapping Engine** | **Leaflet & OpenStreetMap** | Leaflet provides client-side map rendering; OpenStreetMap supplies map data and raster tiles subject to mandatory attribution (`© OpenStreetMap contributors`) and browser tile usage policies. Geocoding is evaluated separately. |
| **Data Visualization** | **Recharts** | Composable charting library built on React and D3 SVG components, providing responsive budget breakdowns and expense distributions. |

---

## 4. Design Direction & Aesthetic Vision

TripMind departs from conventional "dark mode AI dashboards," neon accents, and soulless SaaS interfaces. Instead, it embodies a **premium editorial travel aesthetic** inspired by vintage field journals, independent travel publications (such as *Cereal*, *Kinfolk*, and *Condé Nast Traveler*), and tactile paper goods.

### 4.1 Key Visual Principles
- **Warmth & Grounding:** Warm ivory background (`#F7F5EF`) replaces harsh digital whites; deep forest green (`#173D35`) provides rich authority.
- **Editorial Typography:** High-contrast pairing of a refined **editorial serif** for headlines with clean, geometric **DM Sans** for legible body text.
- **Natural Accents:** Terracotta (`#D97757`) for deliberate call-to-actions and muted sage (`#D8DFD5`) for borders, surfaces, and secondary badges.
- **Breathing Room:** Generous whitespace, fine lines, subtle borders, and gentle ambient elevations rather than aggressive drop shadows or neon glows.

---

## 5. Development Sequence & Feature Implementation Order

Development across the TripMind codebase must strictly respect the following sequential stages:

```
[ Stage 1: Foundation & Shared Infrastructure ]
  ├── Vite + Tailwind CSS v4 (@theme tokens)
  ├── Base Layout Shell (Navbar, Footer, PageShell)
  └── Centralized Axios Client (client/src/services/api/apiClient.js)
                 │
                 ▼
[ Stage 2: Landing Page & Visual Experience ]
  ├── Editorial Hero section with brand typography
  ├── Value proposition & feature showcases
  └── Interactive preview of destination & itinerary cards
                 │
                 ▼
[ Stage 3: Authentication & User Accounts ]
  ├── Backend auth routes (/api/auth) with single-point bcrypt hashing
  ├── User model with schema validation
  └── Client auth forms, session handling, and protected routes
                 │
                 ▼
[ Stage 4: Trip CRUD & Itinerary Workspace ]
  ├── Trip model with embedded days, activities, and budget
  ├── Trip CRUD endpoints (/api/trips) and User dashboard
  └── Day/Activity management (add, edit, delete activities)
                 │
                 ▼
[ Stage 5: AI Itinerary, Maps & Budget Analytics ]
  ├── Backend LLM proxy integration (/api/ai/generate-itinerary)
  ├── Leaflet + OpenStreetMap interactive pin visualization
  └── Recharts categorical budget breakdown
```

---

## 6. Monorepo Organization Overview

The TripMind repository is organized as a clean dual-directory monorepo:

- **`client/`**: React single-page application (SPA) created with Vite, styled with Tailwind CSS v4, communicating with Express via `client/src/services/api/`.
- **`server/`**: Express REST API application with entry point `server/server.js` and application modules under `server/src/`, handling authentication, database interactions via Mongoose models, and backend LLM proxy services.
- **Project Root**: Repository-wide documentation, operational guidelines, configuration, and architectural decision records.
