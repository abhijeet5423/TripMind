# TripMind — UI Design System & Aesthetic Guide

> **Aesthetic Philosophy:** Premium Editorial Travel Experience  
> **Inspiration:** Literary travel journals, vintage field guides, and print magazines (*Cereal*, *Kinfolk*, *Condé Nast Traveler*).  
> **Anti-Patterns:** Avoid generic dark SaaS dashboards, neon cyan/magenta gradients, over-rounded toy-like buttons, and cluttered widget grids.  
> **Motion Standards:** See [`UI_MOTION_GUIDELINES.md`](./UI_MOTION_GUIDELINES.md) for global animation principles, approved inventory, timing tiers, and accessibility safeguards.

---

## 1. Tailwind CSS v4 Architecture & CSS-First Theme Configuration

TripMind is styled using **Tailwind CSS v4**, which eliminates legacy JavaScript configuration files (`tailwind.config.js`) in favor of a modern **CSS-first `@theme` configuration**.

### 1.1 CSS Entry Point (`client/src/index.css`)
All design tokens, custom colors, and font families are declared directly in `client/src/index.css` using the `@theme` block:

```css
@import "tailwindcss";

@theme {
  /* Brand Editorial Colors */
  --color-sand-ivory: #F7F5EF;
  --color-forest: #173D35;
  --color-forest-dark: #102D27;
  --color-terracotta: #D97757;
  --color-terracotta-dark: #C46444;
  --color-sage: #D8DFD5;
  --color-sage-light: #E7ECE5;
  --color-charcoal: #242923;
  --color-stone: #686E65;

  /* Semantic Feedback */
  --color-olive-grove: #2E5B3D;
  --color-ochre-gold: #C28B38;
  --color-burnt-crimson: #B33A3A;

  /* Typography Families */
  --font-serif: "Playfair Display", ui-serif, Georgia, Cambria, "Times New Roman", serif;
  --font-sans: "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
```

This configuration instantly exposes utility classes across the application without runtime overhead:
- Backgrounds: `bg-sand-ivory`, `bg-forest`, `bg-terracotta`, `bg-sage`
- Typography: `text-forest`, `text-charcoal`, `text-terracotta`, `text-stone`, `font-serif`, `font-sans`
- Borders: `border-sage`, `border-sage-light`, `border-forest`

---

## 2. Color Palette & Semantics

The TripMind palette uses warm, organic, earthy tones that evoke linen paper, dense pine forests, terracotta ceramics, and weathered stone.

### 2.1 Core Brand Colors

| Swatch | Name | Hex Code | Role & Usage | Tailwind v4 Utility |
| :---: | :--- | :--- | :--- | :--- |
| ![#F7F5EF](https://dummyimage.com/20x20/F7F5EF/F7F5EF.png) | **Warm Ivory** | `#F7F5EF` | Primary application canvas background, soft container surfaces. | `bg-sand-ivory` |
| ![#173D35](https://dummyimage.com/20x20/173D35/173D35.png) | **Forest Green** | `#173D35` | Primary brand tone, header bars, authoritative buttons, heavy accents. | `text-forest`, `bg-forest` |
| ![#D97757](https://dummyimage.com/20x20/D97757/D97757.png) | **Terracotta** | `#D97757` | Primary action accent, key interactive highlights, active states. | `text-terracotta`, `bg-terracotta` |
| ![#D8DFD5](https://dummyimage.com/20x20/D8DFD5/D8DFD5.png) | **Muted Sage** | `#D8DFD5` | Subtle borders, secondary badges, card dividers, soft hover fills. | `border-sage`, `bg-sage` |
| ![#242923](https://dummyimage.com/20x20/242923/242923.png) | **Dark Charcoal** | `#242923` | Primary body typography, deep headings, maximum contrast text. | `text-charcoal` |

### 2.2 Extended Supporting Palette

| Role | Color | Hex Code | Purpose | Tailwind v4 Utility |
| :--- | :--- | :--- | :--- | :--- |
| **Card Surface** | Pure Linen White | `#FFFFFF` | Elevated card surfaces and modal dialog backgrounds. | `bg-white` |
| **Muted Text** | Weathered Stone | `#686E65` | Subtitles, secondary metadata, timestamps, helper labels. | `text-stone` |
| **Subtle Divider** | Light Sage Tint | `#E7ECE5` | Card dividers, timeline vertical rules, horizontal borders. | `border-sage-light` |
| **Status: Success** | Olive Grove | `#2E5B3D` | Budget under cap, confirmation notifications. | `text-olive-grove` |
| **Status: Warning** | Ochre Gold | `#C28B38` | Tight budget warnings, schedule transit alerts. | `text-ochre-gold` |
| **Status: Danger** | Burnt Crimson | `#B33A3A` | Over-budget alerts, destructive delete confirmations. | `text-burnt-crimson` |

---

## 3. Typography System

The typographic identity balances literary prestige with modern legibility through a deliberate serif/sans-serif pairing.

### 3.1 Font Families
- **Editorial Headings:** `font-serif` (*Playfair Display*, falling back to `ui-serif, Georgia, serif`).
  - *Character:* Elegant, editorial, literary, deliberate letterforms.
- **Body & Functional UI:** `font-sans` (*DM Sans*, falling back to `ui-sans-serif, system-ui, sans-serif`).
  - *Character:* Crisp, modern geometric-humanist sans-serif providing high legibility at small sizes and in dense itinerary lists.

### 3.2 Scale & Hierarchy

| Token | Size / Line-Height | Weight | Font Family | Typical Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display (Hero)** | `3.25rem (52px)` / `1.15` | Medium (500) | Editorial Serif (`font-serif`) | Landing page main headline. |
| **H1 (Page Title)** | `2.25rem (36px)` / `1.2` | SemiBold (600) | Editorial Serif (`font-serif`) | Dashboard, Trip detail titles. |
| **H2 (Section)** | `1.75rem (28px)` / `1.25` | Medium (500) | Editorial Serif (`font-serif`) | Itinerary day headers, budget sections. |
| **H3 (Card Header)**| `1.25rem (20px)` / `1.3` | SemiBold (600) | Editorial Serif (`font-serif`) | Activity titles, destination card titles. |
| **Subtitle / Lead** | `1.125rem (18px)` / `1.5` | Regular (400) | DM Sans (`font-sans`) | Hero subheaders, destination descriptions. |
| **Body (Default)** | `1.0rem (16px)` / `1.6` | Regular (400) | DM Sans (`font-sans`) | Standard paragraphs, modal text, activity descriptions. |
| **Small / Caption** | `0.875rem (14px)` / `1.4` | Medium (500) | DM Sans (`font-sans`) | Timestamps, badge tags, form field labels. |
| **Overline (Kicker)**| `0.75rem (12px)` / `1.0` | Bold (700) | DM Sans (`font-sans` Uppercase) | Day tags, category labels (`tracking-widest`). |

---

## 4. Spatial System, Borders & Elevation

### 4.1 Spacing Rhythm (8pt Base Unit)
- Spatial rhythm conforms to multiples of 4px / 8px:
  - `p-2` / `m-2`: 8px (tight gaps between badges or tags)
  - `p-4` / `m-4`: 16px (card inner padding, input field padding)
  - `p-6` / `m-6`: 24px (standard container padding, section gaps)
  - `p-8` / `m-8`: 32px (major layout blocks)
  - `py-12` / `py-16`: 48px – 64px (page section dividers on landing pages)

### 4.2 Border Radii & Corners
- Avoid excessive, toy-like "pill" shapes for structural containers.
- **Cards & Modals:** `rounded-xl` (12px) or `rounded-lg` (8px).
- **Buttons:** `rounded-lg` (8px) for a crisp, tailored feel.
- **Pills / Badges:** `rounded-full` (for status chips and category badges only).
- **Input Fields:** `rounded-lg` (8px) with subtle 1px border.

### 4.3 Borders & Elevation
- Editorial layouts rely on fine 1px lines rather than heavy drop shadows.
- **Border Default:** `border border-sage`.
- **Subtle Shadow (Cards):** `shadow-[0_2px_8px_rgba(23,61,53,0.04)]` (A faint, organic forest-tinted shadow).
- **Modal Elevation:** `shadow-[0_8px_30px_rgba(36,41,35,0.08)]`.

---

## 5. Reusable UI Component Conventions

### 5.1 Buttons
- **Primary Button (Forest Green):**
  - Background: `bg-forest` (`#173D35`)
  - Text: `text-sand-ivory` (`#F7F5EF`)
  - Hover: `hover:bg-forest-dark` (`#102D27`) with gentle transition (`transition duration-200`).
  - Padding: `px-5 py-2.5`, `rounded-lg`, font weight 500.
- **Accent Button (Terracotta):**
  - Background: `bg-terracotta` (`#D97757`)
  - Text: `text-white`
  - Hover: `hover:bg-terracotta-dark` (`#C46444`)
  - Usage: Key calls to action, "Generate with AI", "Confirm Trip".
- **Secondary / Outline Button:**
  - Background: Transparent or `bg-white`
  - Border: `border border-sage`
  - Text: `text-forest`
  - Hover: Background `hover:bg-sand-ivory`.
- **Ghost Button:**
  - Transparent background, `text-forest`, hover with subtle sage tint (`hover:bg-sage/30`).

### 5.2 Form Inputs & Controls
- **Background:** Pure White (`bg-white`) or Warm Ivory Tint (`bg-sand-ivory`).
- **Border:** `border border-sage`.
- **Focus Ring:** `focus:border-forest focus:ring-1 focus:ring-forest` (No loud blue or purple rings).
- **Labels:** `text-xs font-semibold uppercase tracking-wider text-stone`.
- **Placeholders:** `text-stone/60`.

### 5.3 Itinerary Day & Activity Cards
- **Day Header:** Editorial serif headline with a terracotta or forest green day badge (e.g., "DAY 01 — Arrival & Historic Center").
- **Activity Item Card:**
  - White surface with `border border-sage`.
  - Left timeline bar or marker badge.
  - Time slot pill (e.g., "09:30 AM" or "Morning") in muted sage.
  - Activity title in serif (`font-serif`) or medium sans.
  - Location tag with mini icon and estimated cost in terracotta (`text-terracotta`).
  - Inline action controls (Edit, Delete, Add).

### 5.4 Map Styling (Leaflet & OpenStreetMap)
- Map container encased in `rounded-xl border border-sage overflow-hidden`.
- Custom marker pins styled using Forest Green (`#173D35`) and Terracotta (`#D97757`) for active stops.
- Clean map popups styled with Warm Ivory backgrounds and serif titles.
- **Mandatory Attribution Overlay:** Prominently display the required OpenStreetMap attribution notice (`© OpenStreetMap contributors`) in the lower corner with clean, legible sans-serif styling adhering to brand neutrals.

### 5.5 Chart Theming (Recharts)
- Chart colors align strictly with the brand tokens and the 6 canonical categories established in Day 34/35:
  - **Accommodation:** Sky Blue (`#0284c7`)
  - **Food & Dining:** Warm Amber (`#d97706`)
  - **Activities & Tours:** Deep Forest Green (`#173D35`)
  - **Transportation:** Royal Indigo (`#4f46e5`)
  - **Local Transit:** Teal (`#0d9488`)
  - **Miscellaneous:** Warm Slate / Stone (`#686E65`)
- Comparison Bar Tokens:
  - **Target Budget Cap:** Forest Green (`#173D35`)
  - **Total Estimated (On Track):** Terracotta (`#D97757`)
  - **Total Estimated (Over Budget):** Burnt Crimson (`#B33A3A`)
  - **Remaining Buffer:** Teal (`#0d9488`) / Muted Stone (`#A8A29E`) when depleted
- Tooltips: Clean editorial card using white background, muted sage border (`#D8DFD5`), subtle shadow, and sans-serif typography with exact currency and percentage formatting.
- Accessibility: Hidden screen-reader summary lists (`sr-only`) and ARIA region roles (`role="region" aria-label="..."`) accompanying every chart.

### 5.6 Editorial Imagery & Performance Conventions
- **Asset Format & Compression**: Atmospheric photography (Hero backdrops, destination showcase cards) must be delivered in WebP format with high-quality bicubic downsampling (quality ~0.82–0.85), targeting 300–600 KB to balance instantaneous load times with editorial visual fidelity on 4K/Retina displays.
- **Composition & Aspect Ratio**: Preserve the natural proportions of source artwork without stretching or distortion.
- **Protective Overlays**: Pair full-bleed photographic assets with responsive protective overlays (`bg-gradient-to-b` on mobile/tablet, `lg:bg-gradient-to-r` on desktop) utilizing brand neutrals (`forest-dark`) to guarantee WCAG AA contrast for editorial typography across bright scenic highlights.
- **Master Asset Archival**: Maintain original high-resolution master image files as local backups.

### 5.7 Destination Discovery & Showcase Cards
- **Card Shell**: White container (`bg-white`) encased in `rounded-xl border border-sage overflow-hidden`, elevated with an organic, subtle shadow (`shadow-[0_2px_8px_rgba(23,61,53,0.04)] hover:shadow-[0_8px_24px_rgba(23,61,53,0.08)]`) with gentle 300ms transition.
- **Visual Container Plate**: Strict `aspect-[4/3]` proportion mirroring classic travel publication photography plates. Verified photography is rendered with `object-cover object-center` and paired with a subtle vertical gradient veil (`from-black/25 via-transparent to-black/15`) to ground edges and guarantee floating badge legibility.
- **Subtle Hover Scaling**: On hover-capable viewports, card images gently scale up (`group-hover:scale-105 transition-transform duration-500 ease-out`), while strictly respecting `motion-reduce:transition-none`.
- **Graceful Placeholder Fallback**: If an image fails to load or is unverified, cards seamlessly fallback to an intentional editorial placeholder plate (`bg-gradient-to-br from-sage/35 via-sand-ivory to-sage/20`) with a centered category insignia lens.
- **Floating Category Badge**: Positioned at top-left of the visual plate using `bg-sand-ivory/95 border border-sage/80 text-forest text-xs font-sans font-medium` with a 6px terracotta dot indicator.
- **Category Filter Pills**:
  - Inactive State: `bg-white/80 text-stone border border-sage hover:bg-white hover:text-forest hover:border-forest/40 active:bg-sand-ivory`.
  - Active State: `bg-forest text-sand-ivory border border-forest shadow-xs`.
  - Geometry & Sizing: `min-h-[40px] px-4 py-2 sm:px-4.5 sm:py-2 rounded-full text-xs sm:text-sm font-sans font-medium` with `focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2`.
- **Typography & Content Hierarchy**:
  - Country overline: Terracotta `MapPin` icon paired with uppercase tracking-wider text (`text-xs font-sans font-semibold text-terracotta`).
  - Destination name: Editorial serif headline (`font-serif text-xl sm:text-2xl font-bold text-forest`).
  - Narrative lead: High-readability body copy (`text-sm font-sans text-stone leading-relaxed`).

---

### 5.8 Hero Video & Shared Authentication Backdrop Conventions

#### 1. Hero Video Background (`client/src/assets/hero/hero-video.mp4`)
- **Asset Location & Identity:** Web delivery asset resides at `client/src/assets/hero/hero-video.mp4` (1920x1080, H.264 / AVC1, silent, 4.55 MB, 10.87s), imported directly in `Hero.jsx`.
- **Visual Presentation & Natural Color Fidelity:** Rendered as the full-bleed background for the landing page Hero section. Completely eliminates all gradient overlays, dark ambient washes, color tints, opacity layers, and filters over the video. The video is displayed in its original, vibrant natural colors.
- **Native HTML5 Playback:** Pure semantic `<video>` element configured with `autoPlay`, `muted`, `loop`, `playsInline`, and `preload="auto"`.
- **Responsive Layout & Aspect Ratio:** Uses `object-cover object-center` within an `absolute inset-0 w-full h-full` container, maintaining its original 16:9 aspect ratio without distortion or stretching across mobile (375px, 390px), tablet (768px), laptop (1024px), and desktop (1440px) viewports with zero horizontal overflow.
- **Accessibility (`prefers-reduced-motion`) & Fallback:** Actively listens to `(prefers-reduced-motion: reduce)` and handles playback errors (`onError`). When motion is reduced or if video fails to load, gracefully displays the static poster image (`client/src/assets/hero/hero-poster.webp`), which is a matching 1920x1080 WebP keyframe extracted directly from the video (emerald river canyon gorge) ensuring seamless visual continuity with zero flash.
- **Layout Preservation:** All editorial narrative copy, headlines, primary and secondary CTA buttons, product pillars, and the floating illustrative preview card remain preserved in their exact positions.
- **Master Asset Preservation & Web Optimization:** The original 3840×2160 (4K UHD) H.265/HEVC video asset (~208.41 MB) at `client/src/assets/hero video.mp4` is strictly preserved on local disk as the master archive asset (excluded from Git via `.gitignore`). The web delivery asset `client/src/assets/hero/hero-video.mp4` (4.55 MB) is tracked in Git, ensuring it is bundled in all Vite production builds and deployed cleanly to Vercel within platform size budgets.
- **Universal Browser Compatibility:** Encoded in standard H.264 / AVC1 profile (1080p, audio stripped, 4.55 MB) streamed efficiently via standard HTTP Range requests (206 Partial Content), guaranteeing instant progressive playback and reliable muted autoplay across Chrome, Safari, Edge, Firefox, and mobile browsers.

#### 2. Shared Authentication Backdrop (`client/src/assets/tama66-night-sky-10506842.jpg`)
- **Single Shared Asset Rule:** Both `LoginPage.jsx` and `RegisterPage.jsx` import and render the exact same asset: `client/src/assets/tama66-night-sky-10506842.jpg`.
- **Full-Page Coverage & Natural Colors:** Rendered full-screen behind the authentication content using `object-cover object-center` (`absolute inset-0 w-full h-full`). Displays the night sky in its natural colors with zero stretching or distortion.
- **Zero Background Overlays:** Completely eliminates all gradient overlays, dark ambient overlays, uniform color veils, opacity layers, image filters, and background blur applied to the background.
- **Form Card Contrast Isolation:** The elevated form card (`bg-white/95 backdrop-blur-md rounded-xl border border-sage/80 shadow-[0_12px_40px_rgba(16,45,39,0.35)]`) provides 100% of the required form contrast (WCAG AAA contrast for inputs, labels, and buttons against dark charcoal text), guaranteeing readability without requiring background overlays.
- **Responsive Verification:** Fully verified across mobile (375px, 390px), tablet (768px), laptop (1024px), and desktop (1440px) viewports with zero horizontal overflow, no layout shifts, and full form usability.

---

### 5.9 Guided Trip Creation Wizard & Progress Architecture
- **3-Step Structure + Confirmation Review:**
  - **Step 1 (Trip Basics):** Origin, Destination (primary visual focal point with route relationship), Departure & Return dates with automatic duration calculation (`X-day journey`).
  - **Step 2 (Budget & Travellers):** Prominent total budget input with directly associated currency selector, touch-friendly minus/plus counter for travellers (clamped between 1 and 50), and visually secondary custom journey title.
  - **Step 3 (Travel Preferences):** Visually distinct travel pace selection cards (`Relaxed`, `Moderate`, `Fast-Paced`), selectable chips for curated popular interests with custom tag additions, accommodation presets, transit options, dietary chips, and notes.
  - **Step 4 (Final Review):** Compact summary cards displaying route, dates, investment, party, and preferences with direct `Edit` triggers jumping back to specific steps.
- **Dual Progress Indicator Pattern:**
  - **Segmented Step Progress:** 3-bar indicator visually communicating completed steps (forest fill with checkmark), active step (terracotta fill), and remaining steps (muted sage).
  - **Dedicated Required-Detail Counter:** Explicitly reports `"X of 5 required details completed"`. Tracks strictly the 5 backend-required fields (`startingLocation`, `destination`, `departureDate`, `returnDate`, and `budget`), preventing false 100% completion while required fields are missing and guaranteeing optional fields do not dilute progress.
- **Responsive & Viewport Discipline:** Wide, elegant modal container on desktop (`max-w-2xl` to `max-w-3xl`) with compact step layouts that fit comfortably without awkward nested scrolling; responsive single-column layout on mobile with comfortable touch targets ($\ge 44\times 44\text{px}$) and natural scrolling.

---

### 5.10 Edit Trip Modal & Card Action Controls
- **Card Action Controls:**
  - Trip cards feature dual, non-intrusive Edit action triggers:
    1. Header icon button (`Edit3`) adjacent to the status badge with accessible tooltip and ARIA label.
    2. Footer text button (`Edit Details`) with terracotta pencil icon in the journal entry footer.
- **Tabbed Modal Navigation (`EditTripModal.jsx`):**
  - **Basics Tab:** Origin, Destination, Departure & Return date inputs with real-time duration badge, and status lifecycle selector (`draft`, `upcoming`, `completed`).
  - **Budget & Party Tab:** Numerical budget input with currency selector, 1–50 travellers counter, custom title, and optional cover image URL.
  - **Preferences & Style Tab:** 3-tier travel pace cards, popular & custom interest chips (up to 30), accommodation/transit presets, dietary chips (up to 20), and 500-char mindful travel notes.
  - **Tab Badge Indicators:** Subtle crimson dot indicator on tab headers signaling unresolved validation errors within inactive tabs.
- **Form State Prepopulation & Natural Key Reset:**
  - Modal mounts with `key={tripId}` to naturally reset controlled form state without triggering cascading render effects.
  - ISO date strings are parsed and formatted to `YYYY-MM-DD` for native HTML5 date input compatibility across all browsers.
  - Partial update delta calculation compares entered values against initial trip prop, dispatching only changed fields to `PATCH /api/trips/:id` and notifying the traveler if no modifications were detected.
- **Responsive Discipline & Accessibility:**
  - Fixed modal header and action footer with independent, scrollable tab canvas (`max-h-[90vh]`).
  - Escape key listener, auto-focus on initial input, and focus trapping.
  - Loading spinner state during submission (`isUpdating`) with disabled submit buttons to prevent double-submissions.

---

### 5.11 Delete Confirmation Dialog & Destructive Actions
- **Destructive Button (`variant="danger"`):**
  - Background: `bg-burnt-crimson` (`#B33A3A`), hover: `hover:bg-[#9B2F2F]`, active: `active:bg-[#852727]`.
  - Contrast: Crisp white typography with `focus-visible:ring-burnt-crimson`.
  - Usage: Reserved strictly for irreversible destructive operations (trip deletion).
- **Confirmation Dialog Anatomy (`DeleteTripModal.jsx`):**
  - **Role & Semantics:** `role="alertdialog"`, `aria-modal="true"`, with explicit `aria-labelledby` and `aria-describedby` associations.
  - **Visual Alert Indicator:** Centered circular insignia featuring `AlertTriangle` in Burnt Crimson over a soft `bg-burnt-crimson/10` wash.
  - **Trip Identification Card:** Previews destination, starting location, dates, traveler count, budget, and title to provide clear confirmation context before destruction.
  - **Explicit Destruction Disclosure:** Text explicitly communicates that deletion permanently erases all associated days, activities, and budget summaries from MongoDB with no rollback.
  - **Safety-First Focus:** Auto-focuses the "Keep Journey" (Cancel) button upon mount, preventing accidental form submission via the Enter key.
  - **Failure Resilience:** Keeps dialog open upon network/server rejection, presenting an inline error alert and preserving user intent.

---

### 5.12 Itinerary Workspace & Generation Conventions

#### 1. Activity Card Anatomy (`ActivityCard.jsx`)
- **Pacing & Time Badges:** 12-hour AM/PM start time with `Clock` icon, estimated duration badge, and uppercase timeSlot qualifier (`Morning`, `Afternoon`, `Evening`, `Night`).
- **Category Badge Color Tokens:**
  - `food`: `bg-amber-50 text-amber-800 border-amber-200/80` with `Utensils` icon.
  - `activity`: `bg-forest/10 text-forest border-forest/25` with `Compass` icon.
  - `stay`: `bg-sky-50 text-sky-800 border-sky-200/80` with `Bed` icon.
  - `transit`: `bg-indigo-50 text-indigo-800 border-indigo-200/80` with `Bus` icon.
  - `other`: `bg-sand-ivory text-stone border-sage` with `MapPin` icon.
- **Location & Spatial Hierarchy:** Venue name with terracotta `MapPin`, optional physical address, or coordinate fallback (`lat, lng`).
- **Party Cost & Breakdown:** Authoritative total party expenditure formatted in trip currency; optional human-readable editorial `costBreakdown` rendered in muted italic caption.
- **Graceful Resilience:** Zero rendering of raw `undefined`, `null`, or broken layout gaps when optional fields are empty.

#### 2. Categorical Budget Breakdown (`BudgetBreakdown.jsx`)
- **Authoritative 6-Category Grid:** Itemizes Accommodation, Food, Activities, Transportation, Local Transit, and Miscellaneous against the backend-persisted `budgetSummary`.
- **Target vs. Estimated Comparison:** Displays user's initial target budget, total estimated spend, remaining buffer, and a proportional color-coded progress bar.
- **Category Distribution Stack:** Proportional horizontal bar visually communicating expense distribution across the 6 travel pillars.
- **Responsive Geometry:** Collapses cleanly from a 3-column desktop grid to a single-column mobile view with zero horizontal overflow.

#### 3. Regeneration Confirmation Dialog (`RegenerateItineraryModal.jsx`)
- **Preservation Invariant Disclosure:** Text explicitly communicates that the existing itinerary in MongoDB will only be replaced upon a verified, successful generation. If the request fails, times out, or fails validation, the current itinerary is 100% retained.
- **Focus Safety:** Auto-focuses the "Keep Current Itinerary" (Cancel) button upon mount to prevent accidental overwrite.
- **Locked Actions:** Action buttons disable during `isGenerating` to prevent duplicate submissions.

#### 4. Itinerary Workspace Canvas (`TripDetailPage.jsx`)
- **Route & Layout:** Mounted at `/trips/:id` with back navigation to `/dashboard`.
- **Generation State Handling:**
  - *Idle:* Prominent "Generate Itinerary with AI" CTA with mindful travel description.
  - *Generating:* Pulsing loading card with spinner, informative explanation of 10–25s duration, disabled action controls, and zero deceptive progress bars.
  - *Success:* Dismissible green confirmation banner with immediate in-memory rendering.
  - *Failure:* Alert banner with mapped human-readable error from `mapItineraryError`, retry action, and complete preservation of previously displayed itinerary.
- **Day Navigation Tabs:** Horizontal scrollable day pill tabs allowing rapid navigation between Day 1 through Day N on both mobile touchscreens and desktop viewports.

---

### 5.13 Authenticated Dashboard Physical Travel Pinboard Conventions

#### 1. Board Surface & Spatial Frame (`CorkBoard.jsx`)
- **Isolation Scope:** The physical travel-planning board is strictly isolated to the authenticated `/dashboard` route. It is never rendered globally or leaked into public routes (`/`, `/login`, `/register`) or itinerary workspaces (`/trips/:id`).
- **Physical Wall Mount & Frame:**
  - Outer border: Deep walnut wooden molding (`bg-[#543820]`, rounded-3xl bevel styling, dark outer shadow `shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)]`).
  - Ambient board lighting: Multi-stop radial gradients overlaid on a warm cork foundation (`#BA8950`), simulating overhead gallery spotlighting with natural corner vignette (`rgba(0,0,0,0.22)`).
  - Tactile cork grain: Micro-flecks rendered via repeating radial CSS dot textures without paid external image APIs.
- **Header Plaque & Workspace Identity:**
  - Aged brass plaque (`bg-amber-100/90 text-amber-950 border border-amber-300/80 rounded-full px-4 py-1.5`) positioned at top center, reading "Travel Planning Pinboard • X journeys pinned".
  - Top action bar featuring clear workspace headline ("My Travel Pinboard") and secondary quick-pin action.

#### 2. Pinned Trip Paper Anatomy (`PinnedTripCard.jsx`)
- **Tactile Paper Construction:**
  - Foundation: Heavyweight linen paper sheet (`bg-[#FAF7EE]`, text-[#2C2416], rounded-xl).
  - Shadow & Depth: Multilayered realistic contact shadow (`shadow-[0_12px_28px_rgba(44,36,22,0.22),0_2px_6px_rgba(44,36,22,0.12)]`).
  - Washi Tape Accent: Translucent paper tape strip (`bg-[#E8DFC8]/80 border-t border-b border-[#D5C9AE]`) taped across the top edge.
  - Organic Rotations: Subtle rotation angles (`lg:-rotate-1.5` through `lg:rotate-1.5`) applied exclusively on desktop displays (`lg:` $\ge 1024\text{px}$). On hover, smooth transition to upright (`hover:rotate-0 hover:scale-[1.02]`). Rotations are zeroed on mobile and tablet (`< 1024\text{px}`) to guarantee zero horizontal scrollbar overflow.
- **Physical 3D Pushpin & Expanded Palette (`PushPin.jsx` & `pinPalette.js`):**
  - Scalable vector thumbtack rendered with multi-stop spherical radial gradients (`radialGradient` with specular highlights).
  - Physical elements: Polished rounded head, recessed metallic collar, sharp steel pin tip, and realistic angled contact drop shadow (`ellipse` at bottom).
  - Expanded 10-Color Heritage Palette:
    - `terracotta`: `#D97757` (Tuscan Terracotta)
    - `forest`: `#1B4D3E` (Alpine Forest)
    - `brass`: `#C28B38` (Burnished Brass)
    - `crimson`: `#B33232` (Vintage Crimson)
    - `cobalt`: `#2E5E8A` (Maritime Cobalt)
    - `amber`: `#D49028` (Golden Amber)
    - `sage`: `#557A5E` (Olive Sage)
    - `plum`: `#783A5D` (Mulberry Plum)
    - `slate`: `#4F656F` (Basalt Slate)
    - `copper`: `#BD683A` (Polished Copper)
  - Deterministic Color Assignment (`getStablePinColor`):
    - Uses 32-bit FNV-1a hashing over stable trip identity (`trip._id`, title, or destination) to assign distinct colors uniformly.
    - Guarantees 100% stability: trip pins never change colors when trips are filtered, reordered, or rerendered. Requires zero schema alterations or backend fields.
    - The Add Trip note features a coordinated `brass` thumbtack matching the dashed parchment border.
- **Printed Photograph & Postcard Plate (`destinationImages.js`):**
  - Polaroid style frame: White border (`p-1.5 bg-white shadow-sm rounded-lg`) with aspect-ratio $16:10$ destination photo plate.
  - Curated Registry: Verified local WebP assets for iconic destinations (Kyoto, Swiss Alps, Bali, Manali, Varanasi, Amalfi Coast) with open-license photographer attribution.
  - Graceful Fallback: High-resolution serene mountain landscape fallback (`painting-mountain-lake-with-mountain-background.webp`) for uncurated custom destinations, avoiding broken `<img>` icons or paid external CDNs.
- **Card Content & Action Hierarchy:**
  - Destination headline (`font-serif text-xl font-bold tracking-tight text-[#2C2416]`).
  - Journey metadata: Travel date badge with `Calendar` icon, origin/route badge with `Navigation` icon, traveler count badge with `Users` icon, and formatted total budget pill.
  - Status indicator: Subtle status chip (`Upcoming`, `Ongoing`, `Completed`).
  - Primary Action: High-contrast terracotta button ("Open Itinerary" / `bg-terracotta hover:bg-[#C26547] text-white shadow-sm font-medium`).
  - Auxiliary Controls: Unobtrusive Edit (pencil) and Delete (trash) buttons in card header for full journey lifecycle management.

#### 3. Add Trip Blank Note (`AddTripPinCard.jsx`)
- **Visual Conception:** Pinned unwritten parchment sheet waiting for travel inspiration.
- **Styling:** Warm cream paper (`bg-[#FAF7EE]/70 hover:bg-[#FAF7EE]`), dashed brass border (`border-2 border-dashed border-[#C5B396] hover:border-terracotta/70`), and a central polished brass pushpin.
- **Interaction:** Large accessible button triggering the existing 4-step `CreateTripModal.jsx` wizard without altering validation or API contracts.

#### 4. Navigation & Profile Interactions (`Navbar.jsx`)
- **Dashboard Visibility:** Unified navigation bar is permanently mounted at the top of `/dashboard`, maintaining brand continuity across public and authenticated states.
- **Redundancy Elimination & Clear Role Separation:**
  - *Primary Navigation vs. Account Actions:* Desktop navigation cleanly separates workspace actions from account actions. Main navigation links are editorial (Destinations, Itineraries, Budget Planner, About).
  - *Singular Workspace CTA:* Removed duplicate "Dashboard" text link from desktop `navLinks`. Authenticated travelers access their workspace via a prominent "My Journal" button (`to="/dashboard"`).
  - *Singular Sign Out Action:* Removed redundant standalone "Sign Out" button from the desktop header. Account actions (identity, session details, and Sign Out) are consolidated within the User Profile Flyout.
- **Desktop User Profile Hover Flyout:**
  - Trigger: Mounted on desktop profile trigger (`hidden md:flex`). Opens on `onMouseEnter`.
  - Safe Transit Buffer: Implements a 250ms clearance timeout (`profileTimeoutRef`) so moving the cursor from the trigger across any subpixel gap into the flyout menu does not prematurely collapse the dropdown.
  - Keyboard & Accessibility: Toggles on `Enter` / `Space`, dismisses on `Escape` key, closes on document click-outside, and provides proper ARIA attributes (`aria-expanded`, `aria-haspopup="menu"`).
  - Content: Traveler name, email address, role badge, session security indicator, links to "Explore Destinations", and "Sign Out".
- **Mobile Drawer Menu Exact Hierarchy:**
  - Strict three-item primary order:
    1. **User Profile Card:** Avatar, traveler name, email address, role badge.
    2. **Sign Out Button:** Destructive outline button with `LogOut` icon.
    3. **My Journal Button:** Prominent primary button linking to `/dashboard` with `BookOpen` icon.
  - Followed by clean section links (Destinations, Itineraries, Budget Planner, About) with zero duplicate "Dashboard" link.

#### 5. Itinerary Primary Button Visibility & Contrast (`TripDetailPage.jsx`)
- **Hierarchy & Placement:** Positioned prominently within the Journey Header Banner and the Day 1 Overview empty state.
- **Color & Elevation:** High-contrast Terracotta (`bg-terracotta hover:bg-[#C26547] text-white shadow-md hover:shadow-lg focus-visible:ring-terracotta`) or Forest Green (`bg-forest hover:bg-forest/90 text-sand-ivory border-forest`), delivering $> 4.5:1$ contrast against light and dark backdrops.
- **Interactive Feedback:** Integrated `Sparkles` icon, dynamic `RefreshCw` spin animation on loading, explicit `isGenerating` disabled state with `cursor-not-allowed opacity-60`, and clear focus rings for keyboard navigation.

### 5.14 Itinerary Activity Editing Experience (Day 32)

#### 1. Activity Card Action Trigger (`ActivityCard.jsx`)
- **Action Placement:** Positioned immediately adjacent to the category badge in the card header.
- **Visual Styling:** Unobtrusive, elegant pencil icon (`Edit3`, size 14px) inside a rounded tap target (`p-1 rounded-md text-stone/70 hover:text-forest hover:bg-sand-ivory border border-transparent hover:border-sage transition-all`).
- **Accessibility:** Accessible `aria-label="Edit {activity.title}"` and `title="Edit activity"`, keyboard focusable with high-visibility focus ring (`focus-visible:ring-2 focus-visible:ring-forest`).

#### 2. Edit Activity Modal Dialog (`EditActivityModal.jsx`)
- **Editorial Dialog Container:**
  - Fixed backdrop overlay: `bg-charcoal/50 backdrop-blur-xs` with smooth fade-in animation (`animate-fadeIn`).
  - Modal canvas: `bg-white rounded-2xl border border-sage shadow-2xl max-w-xl w-full p-6 sm:p-8`.
  - Header: Terracotta category chip, serif headline (`font-serif text-2xl font-bold text-forest`), dismiss close button (`X`).
  - Accessibility: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="edit-activity-modal-title"`, Escape key dismiss listener, and backdrop click dismissal (locked during in-flight submission).
- **Form Anatomy & Layout:**
  - *Title Input:* Full-width text field with required indicator (`*`).
  - *Category Selector:* Custom responsive 5-option pill selector (Attraction/Culture, Food & Dining, Accommodation, Transit & Transfer, Other Exploration) with active state highlighting (`bg-forest text-sand-ivory border-forest`).
  - *Time Slot & Time Row:* Two-column grid matching time slot dropdown (Morning, Afternoon, Evening, Night) with clock-adorned time input.
  - *Duration & Location Inputs:* Pre-filled estimated duration and venue/location name with `MapPin` icon.
  - *Estimated Cost & Breakdown Row:* Currency-denominated cost input with `Wallet` icon alongside qualitative cost breakdown notes.
  - *Description & Notes:* Multiline narrative textarea for sensory travel details and tips.
- **State Management & Feedback:**
  - Zero-Effect Remount Pattern: Keyed by `editingActivity._id` in parent, ensuring clean state initialization without React 19 cascading-render warnings.
  - Inline Error Validation: Red border highlights (`border-burnt-crimson bg-burnt-crimson/5`) and caption messages beneath invalid fields.
  - Server Error Banner: Prominent `AlertCircle` notification box if the PATCH API rejects the update.
  - Submission Lock: Save button displays `Loader2` spinner with disabled state to prevent duplicate submissions.

---

### 5.15 "How to Use TripMind" Section Conventions (`HowItWorks.jsx`)

#### 1. Spatial Placement & Narrative Progression
- **Landing Page Flow:** Positioned immediately below `<Hero />` and above `<DestinationDiscovery />` on `LandingPage.jsx`.
- **Narrative Logic:** Connects aspirational wanderlust from the cinematic Hero video directly to a concrete, approachable 5-step operational model before inviting travelers to explore the destination catalog.
- **Anchor Offset:** Bound to `id="how-it-works"` with `scroll-mt-20`, ensuring smooth-scroll transitions from desktop and mobile navigation links dock cleanly below the 80px (`h-20`) sticky navbar.

#### 2. Design Tokens & Visual Anatomy
- **Section Canvas:** Warm Ivory foundation (`bg-sand-ivory`, `#F7F5EF`) framed with top border rule (`border-t border-sage`).
- **Editorial Eyebrow:** Muted sage pill (`bg-sage/50 border border-sage text-forest text-xs font-sans font-semibold tracking-widest uppercase`) paired with a terracotta `Sparkles` icon (`text-terracotta`).
- **Typography:**
  - Section Headline: Playfair Display serif (`font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-forest tracking-tight`).
  - Section Subtitle: DM Sans modern body (`font-sans text-stone text-base sm:text-lg leading-relaxed`).
  - Step Numbers: Editorial Playfair Display numbers (`font-serif text-2xl font-bold text-terracotta`).
  - Step Titles: Playfair Display card headers (`font-serif text-lg font-bold text-forest leading-snug`).
  - Step Core Summaries: Semi-bold DM Sans callouts (`font-sans text-xs sm:text-sm font-semibold text-charcoal/90`).
  - Step Descriptions: High-readability weathered stone text (`font-sans text-xs text-stone leading-relaxed`).

#### 3. Responsive Grid Architecture
- **Desktop ($\ge 1024\text{px}$):** 5-column linear grid (`lg:grid-cols-5 gap-4 xl:gap-5`) displaying all five chronological steps in a single cohesive row.
- **Tablet ($768\text{px} - 1023\text{px}$):** 2-column grid (`md:grid-cols-2 gap-6`) where the final 5th card spans both columns (`md:col-span-2 lg:col-span-1`) for balanced symmetry.
- **Mobile ($< 768\text{px}$):** Single-column stacked card sequence (`grid-cols-1 gap-6`) with generous touch targets and comfortable reading hierarchy.

#### 4. Card Anatomy & Micro-Interactions
- **Card Container:** Pure Linen White surface (`bg-white rounded-2xl p-6 border border-sage shadow-xs hover:shadow-md hover:border-forest/40 transition-all duration-200 group`).
- **Icon Container:** Warm Ivory circular container (`w-10 h-10 rounded-xl bg-sand-ivory border border-sage/70 text-forest flex items-center justify-center shrink-0 group-hover:bg-forest group-hover:text-sand-ivory group-hover:border-forest transition-colors duration-200`).
- **Feature Badges & Highlights:** Category micro-tag (`text-[10px] uppercase tracking-wider text-stone/80`) paired with a terracotta accent dot, accompanied by itemized feature bullets adorned with olive grove checkmarks (`CheckCircle2`).
- **Editorial Callout Banner:** Elevated white banner card with dual calls-to-action ("Browse Destinations" scrolling to `#destinations`, and "Start Planning Free" leading to `/dashboard` or `/register`).

---

### 5.16 Mobile Responsiveness & Viewport Optimization Standards

#### 1. Viewport Hierarchy & Ergonomics
- **Ultra-Compact Smartphones (320px – 375px):** Minimum tested viewport tier (e.g., iPhone SE, narrow Android devices). Available content width after gutters is only ~280px–340px. Outer modal/frame padding is reduced to `p-2` or `p-3` (avoiding nested padding collapse); currency selector width is clamped (`w-24 sm:w-28`); font sizes scale gracefully (`text-2xl sm:text-3xl`).
- **Standard Modern Smartphones (390px – 430px):** Single-column stacked layouts with full-width primary action controls; natural thumb reachability for bottom buttons.
- **Tablet (768px – 1023px):** 2-column card layouts, balanced grids with centered multi-column spans.
- **Desktop (1024px – 1440px+):** Full multi-column grids, fixed sidebars, hoverable desktop profile flyouts, and expansive corkboard/map views.

#### 2. Modal Viewport Constraints & Scroll Safety
- **Vertical Clamping:** All modal dialogs enforce `my-auto max-h-[92vh] overflow-y-auto` (or `max-h-[94vh]`), preventing off-screen button clipping on short viewports or mobile keyboards.
- **Modal Gutters:** Outer modal wrappers use `p-2 sm:p-6` to maximize available reading and form canvas width. Inner containers use `p-4 sm:p-8`.
- **Action Footers:** Action footers adopt `flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3`. Primary and secondary buttons expand to `w-full sm:w-auto justify-center` on mobile, delivering large thumb-friendly touch targets.

#### 3. Touch Target Minimums
- **Interactive Action Buttons:** Edit, delete, and control buttons feature minimum touch dimensions of $\ge 32\times 32\text{px}$ to $44\times 44\text{px}$ (`min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] p-1.5 sm:p-1 flex items-center justify-center rounded`), preventing touch errors while maintaining editorial elegance on desktop.
- **Floating Action Button (FAB):** Global AI Assistant launcher maintains a prominent 48px–56px circular silhouette (`w-12 h-12 sm:w-14 sm:h-14`) with a full-viewport tap-to-dismiss backdrop on mobile.

#### 4. Mapping & Scroll Trap Elimination
- **Responsive Map Elevation:** Leaflet map canvas dynamically scales height (`h-[280px] sm:h-[360px] lg:h-[400px]`), eliminating vertical mobile scroll traps where dragging gestures capture the map rather than scrolling the itinerary page.

#### 5. Horizontal Tab Swiping
- **Day Navigation Tabs:** Day navigation strips apply `overflow-x-auto scrollbar-none touch-pan-x pb-1.5`, ensuring seamless touch scrolling without obtrusive horizontal scrollbars.

#### 6. Responsive Donut Chart & Legend Architecture (`ExpenseDonutChart.jsx`)
- **Mobile First Legend Layout:**
  - On mobile viewports ($< 640\text{px}$), the breakdown legend switches from a cramped multi-column grid to a spacious single-column list (`grid-cols-1 sm:grid-cols-3 gap-2`). This provides $> 250\text{px}$ width per pill even at 320px viewport width, completely eliminating label truncation (`isTruncated: false`) and preventing category names from colliding with numbers.
  - Mobile legend pills display both the itemized currency amount (`{formatCurrency(item.value, currency)}`, hidden on desktop via `sm:hidden`) and percentage badge (`{item.percentage}%`), providing immediate financial visibility on touchscreens without requiring chart slice hovering.
  - On desktop viewports ($\ge 640\text{px}$), the legend displays a clean 3-column symmetrical grid (`sm:grid-cols-3`) with compact 11px font (`text-[11px]`) and tight horizontal padding (`sm:px-2`), fitting long labels like "Activities & Tours" comfortably without truncation.
- **Center Hole Clearance:**
  - Inner radius calibrated to 54px (`innerRadius={54}`) and outer radius to 80px (`outerRadius={80}`).
  - Total expenditure center text is constrained to `text-xs sm:text-sm md:text-base font-bold text-forest truncate max-w-[85px] sm:max-w-[105px]`, preserving $\ge 15\text{px}$ of circular breathing room from the inner donut ring and preventing text edges from touching or overlapping the SVG donut path.
- **Header Adaptability:**
  - Card header container enforces `flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-sage/40 mb-4`, allowing the total badge to wrap safely below the title on 320px screens (`self-start sm:self-auto`) without text collision.
- **Responsive Heights:**
  - Chart graphic canvas uses `h-[190px] sm:h-[220px]` with `ResponsiveContainer width="100%" height="100%"`, maintaining visual proportionality without vertical inflation.

---

### 5.17 PDF Export & Printable Document Standards (`tripPdfExporter.js`, `TripExportPage.jsx`)

#### 1. Architectural Model & Zero-Dependency Print Engine
- **Approach:** Uses client-side CSS Paged Media standards (`@page { size: A4 portrait; margin: 14mm 14mm 16mm 14mm; }`) and native browser print pipelines (`window.print()`, isolated iframe rendering).
- **Rationale:** Avoids heavy multi-megabyte binary dependencies (like Puppeteer/PDFKit on backend or canvas bloat on frontend). Native browser engines provide pixel-perfect Google Fonts typography (`Playfair Display`, `DM Sans`), 100% vector fidelity, native Indian Rupee (`₹`) unicode glyph rendering, and zero bundle bloat.
- **Dedicated Printable Route:** `/trips/:id/export` provides a standalone, authenticated print preview document with a top action bar (`no-print`), allowing travelers to review or print directly.

#### 2. Page Break Prevention & Layout Hygiene
- **Activity Cards:** Every activity card enforces `break-inside: avoid; page-break-inside: avoid;`, ensuring no card or cost breakdown note is awkwardly severed across page margins.
- **Day Headers & Headings:** Section and day headers enforce `break-after: avoid; page-break-after: avoid;`, ensuring headings never appear orphaned at the bottom of an A4 page.
- **Cover Overview Card:** Framed in Warm Ivory (`#F7F5EF`) with Sage border (`#CCD5C0`), displaying origin, travel dates, traveling party, target budget, journey overview, and travel tips with `break-inside: avoid;`.
- **Financial Architecture Table:** Clean categorical breakdown table itemizing all 6 canonical categories with amount, percentage, and category color dots.

---

### 5.18 Dashboard Experience & Pinned Trip Card Architecture (`PinnedTripCard.jsx`, `CorkBoard.jsx`, `AddTripPinCard.jsx`)

#### 1. Physical Pinboard Philosophy & Canvas Hierarchy
- **Tactile Cork Canvas:** Renders a rich physical corkboard surface (`#BA8950`) layered with multi-point radial gradients simulating textured natural cork porosity, inset shadows (`inset 0 0 80px rgba(35, 18, 8, 0.55)`), and top ambient lighting vignettes.
- **Wooden Frame:** Encased in a beveled hardwood frame (`#543820`, border `#3D2614`) with responsive padding:
  - Mobile ($< 640\text{px}$): `p-3` frame padding, `border-3`, `rounded-2xl`.
  - Tablet ($640\text{px} - 1023\text{px}$): `p-5` to `p-6` frame padding, `border-6`.
  - Desktop ($\ge 1024\text{px}$): `p-7` frame padding, `border-6`, `rounded-3xl`.
- **Brass Plaque:** Fixed brass header badge with mini pushpin and compass emblem displaying journey counters and active filter indicators.

#### 2. Trip Card Anatomy (`PinnedTripCard.jsx`)
- **Card Sizing & Layout Stability:** Every card enforces `flex flex-col justify-between h-full min-h-[440px]` on a Warm Ivory sheet (`#FAF7EE`), matching the exact dimensional height of `AddTripPinCard` to eliminate grid jaggedness.
- **Subtle Rotation Angles:** Cards apply subtle rotations on desktop (`lg:rotate-0.5`, `lg:-rotate-0.5`) and completely upright (`rotate-0`) on mobile and tablet to prevent accidental horizontal overflow.
- **3D Pushpin:** Physically pinned with a realistic multi-gradient SVG thumbtack assigned deterministically from the 10-color heritage palette (`pinPalette.js`).
- **Hero Photograph Plate:**
  - 16:10 aspect ratio (`aspect-[16/10]`) with gentle hover zoom (`group-hover:scale-105 duration-500`).
  - Overlay duration badge (`N Days`) pinned in the bottom corner with dark gradient contrast backing.
  - Elegant linen fallback with compass emblem and subtle typography, preserving exact 16:10 height parity when no photo is available or load fails.
- **Status Indicator Badges:**
  - `Upcoming`: Olive Grove tone (`bg-olive-grove/10 text-olive-grove border-olive-grove/30`).
  - `Completed`: Forest tone (`bg-forest/10 text-forest border-forest/30`).
  - `Draft`: Ochre tone (`bg-ochre-gold/15 text-[#925C18] border-ochre-gold/30`).
- **Itemized Metadata Grid:** Two clean two-column metadata rows displaying origin, date range with total days, traveler count with icon, and formatted currency budget (INR `₹` or selected currency).
- **Generous Touch Targets:** Edit and delete action buttons enforce $\ge 36\times 36\text{px}$ (`min-w-[36px] min-h-[36px]`).
- **Full-Width CTA:** High-contrast editorial button to "Open Itinerary" or "Generate Travel Itinerary".

#### 3. Search & Status Filtering Toolbar
- **Real-Time Text Search:** Debounced input field with left search icon, placeholder, and touch-friendly clear button (`min-w-[32px] min-h-[32px]`).
- **Status Filter Pills:** Segmented pill buttons (`All`, `Upcoming`, `Drafts`, `Completed`) with dynamic count badges and minimum 34px height (`min-h-[34px]`) for touch ergonomics.
- **Reset Trigger:** Instant reset button restores full view when filters are active.

#### 4. Dual Empty State Architecture
- **State A: First-Time Empty State (0 Trips Total):**
  - Warm field journal invitation note: *"Your Travel Canvas Awaits"*.
  - 3-step structured ritual guide explaining the trip creation journey (destination & dates -> budget & preferences -> AI itinerary generation).
  - Quick inspiration destination chips ("Kyoto, Japan", "Amalfi Coast, Italy", "Swiss Alps, Switzerland", "Bali, Indonesia") with instant prefill capability.
  - Prominent primary CTA *"Plan Your First Journey"* paired alongside the tactile `AddTripPinCard`.
- **State B: Filtered / Search No-Results State ($> 0$ Trips Total, 0 Matches):**
  - Dedicated brass-pinned noticeboard card: *"No Journeys Match Your Search"*.
  - Dynamic display highlighting the active query string or filter pill.
  - Friendly suggestion to broaden search parameters.
  - High-visibility *"Clear Search & Filters"* CTA button that immediately restores all pinned trips.

---

### 5.19 Global Viewport Containment, Reduced-Motion & Accessibility Standards (Day 49)

#### 1. Dual Root Overflow Containment (`index.css`)
- **Root Element Containment:** Enforces `overflow-x: hidden;` across both `html` and `body` in `@layer base`.
- **Rationale:** Prevents vertical scrollbar width offsets (16px on desktop) or full-bleed responsive cards from triggering accidental horizontal viewport panning on Windows or narrow viewports (320px–375px), guaranteeing `scrollWidth <= clientWidth`.

#### 2. Media Attribute Standards & DOM Compliance
- **Asset Loading Priority:** LCP background imagery and hero poster layers must strictly use standard React camelCase `fetchPriority="high"` rather than lowercase HTML DOM properties, preventing React console warnings.
- **Aspect Ratio Parity:** Media plates (Hero, Destination discovery cards, Trip card photos) maintain fixed aspect ratios (`aspect-[16/10]`, `aspect-[4/3]`) to prevent layout shifts (CLS).

#### 3. Motion & Reduced-Motion Accessibility
- **CSS-Level Reduced-Motion Overrides:** Global `@media (prefers-reduced-motion: reduce)` block reduces animation and transition durations to 0.01ms and resets `scroll-behavior: auto !important`.
- **Component-Level Motion Guards:** Hero background video checks `window.matchMedia('(prefers-reduced-motion: reduce)')` synchronously during state initialization and renders static photographic fallbacks without video playback.
- **Global Motion Standards:** For complete choreography rules, animation hierarchy, approved component inventory, and timing guidelines, refer to [`UI_MOTION_GUIDELINES.md`](./UI_MOTION_GUIDELINES.md).

#### 4. Touch Targets & Keyboard Navigation Standards
- **Touch Target Ergonomics:** All interactive buttons, tabs, links, and modal dismiss triggers enforce minimum heights of $\ge 34\text{px}$ (`min-h-[34px]`) on desktop/tablet and $\ge 42\text{px}$ on primary mobile actions, with touch padding preventing mis-taps.
- **Dialog Accessibility:** All modal dialogs implement `role="dialog"`, `aria-modal="true"`, explicit heading association (`aria-labelledby`), visible focus rings (`focus-visible:ring-2 focus-visible:ring-forest`), and keyboard Escape key listeners.

---

### 5.20 Hero Section Redesign, Location Discovery & Navigation Standards (Day 51)

#### 1. Responsive Hero Background Video Degradation
- **Responsive Viewport Gating:** Background video (`hero-video.mp4`) only renders in DOM on desktop and tablet viewports ($\ge 768\text{px}$) when `prefers-reduced-motion` is not requested.
- **Mobile Degradation ($< 768\text{px}$):** Video is completely omitted on mobile viewports. On smartphone screens (aspect ratio ~9:19.5), a 16:9 landscape video forces an aggressive ~74% horizontal crop that centers on unreadable blurry pixels while imposing an unnecessary 4.76MB data transfer.
- **Foundational Visual Poster Layer:** Mobile displays a crisp, high-resolution WebP hero poster (`fetchPriority="high"`) overlaid with an atmospheric multi-stop directional scrim (`from-forest-dark/90 via-forest-dark/60 to-forest-dark/35`) providing $\ge 4.5:1$ contrast against editorial headline and subcopy.
- **Preview Card Removal:** The dummy "Illustrative Preview" Dolomites card is removed from the hero grid, streamlining focus onto the core value proposition, primary CTAs ("Start Planning" and "Explore Destinations"), and the three mindful travel pillars.

#### 2. Destination Discovery Architecture
- **Search Box Elimination:** The full-width search input in the homepage Destination Discovery section is removed. Search functionality is intentionally reserved for the authenticated dashboard's Noticeboard, eliminating redundant filtering across a curated 6-card editorial showcase.
- **Category Filter Pills:** 6 themed category filter pills (`All`, `Beach`, `Mountain`, `Cultural`, `Adventure`, `City`, `Relaxing`) are retained with dynamic location count badges.
- **Action Semantics:** Card actions are standardized as explicit "Create Itinerary" buttons linking into the trip creation funnel.

#### 3. Destination Preselection & Route Handshake
- **Deep-Link Contract:** Location discovery cards generate targeted funnel links:
  - Unauthenticated users: `/register?destination=<encodedDestination>`
  - Authenticated users: `/dashboard?destination=<encodedDestination>`
- **Auth Gate Forwarding:** `PublicOnlyRoute`, `LoginPage`, and `RegisterPage` preserve destination query parameters across auth state toggles and post-auth redirects.
- **Modal Mounting & URL Sanitization:** Upon landing on `/dashboard?destination=...`, `DashboardPage` automatically opens `CreateTripModal` with the preselected destination field. When the modal is dismissed, the URL is replaced with `/dashboard` via `navigate('/dashboard', { replace: true })`, eliminating stale parameters from browser history.

#### 4. Navigation Information Architecture Cleanup
- **Budget Planner Navbar Link Removal:** "Budget Planner" link is removed from both desktop navbar and mobile slide-out drawer. The underlying budget calculation engines, activity cost recalculation, and modal budget inputs remain completely intact.
- **Direct Itineraries Routing:** The "Itineraries" navbar link routes directly to `/dashboard` (the user's saved itineraries noticeboard) with visual active state indicator (`border-terracotta text-terracotta`).

---

### 5.21 UI Motion & Animation Integration Standards

TripMind adheres to a calm, purposeful motion architecture powered by `motion` (v14.14.0) with `@/components/core` primitives. All animations strictly comply with [`UI_MOTION_GUIDELINES.md`](./UI_MOTION_GUIDELINES.md).

#### 1. Reusable Component Catalog (`client/src/components/core/`)

| Component | Target Interface Surface | Primary Purpose | Timing / Mechanics |
| :--- | :--- | :--- | :--- |
| `AnimatedBackground` | Desktop Navbar (`Navbar.jsx`) | Fluid spatial indicator for hovered nav item | 300ms spring (`bounce: 0.15`), `layoutId` pill |
| `BorderTrail` | Featured Noticeboard Card (`PinnedTripCard.jsx`) | Subtle visual framing on high-priority journey | 6s loop, `offset-path: rect()`, max 1 per viewport |
| `BorderTrail (Form Card)` | Outer Form Card Containers (`LoginPage`, `RegisterPage`, Modals) | Ambient perimeter framing matching primary button | 8s loop, deep forest green gradient (`from-forest via-[#2E5B3D] to-forest`), outer border only |
| `TextEffect` | Hero Heading (`Hero.jsx`) | Literary staggered entrance for headline | 3D `rotateX: 90 -> 0`, 0.04s char stagger, 0.2s duration |
| `ScrollProgress` | Landing & Itinerary pages | Global reading orientation and scroll depth | 2.5px top bar, `useScroll` + `useSpring` |
| `Tilt` | Destination Discovery Cards (`DestinationCard.jsx`) | Subtle tactile feedback on hover | Max 4.5° 3D perspective tilt, pointer-fine gated |
| `ScrollReveal` | Editorial Landing Sections (`HowItWorks.jsx`, `DestinationDiscovery.jsx`) | Gentle fade-up reveal on scroll | `y: 14 -> 0`, `opacity: 0 -> 1`, `once: true` |

#### 2. Key Architecture Rules
- **Composite-Only GPU Acceleration:** Animations modify only `transform` and `opacity`. Reflow-triggering properties (`width`, `height`, `margin`, `top`, `left`) are prohibited.
- **Mandatory Reduced-Motion Gating:** Every core motion component synchronously evaluates `window.matchMedia('(prefers-reduced-motion: reduce)')` and renders instant, static fallbacks without animation.
- **Accessibility & Non-Interference:** Animated overlays enforce `pointer-events-none` and `aria-hidden="true"`, ensuring full click-through to underlying inputs and zero screen-reader interference.
- **Validation Precedence:** `AnimatedFormField` suppresses all motion when `hasError` is true, immediately prioritizing accessible static error borders (`border-burnt-crimson`).

---

### 5.22 Responsive Mobile Carousels and Itinerary Imagery Standards (Day 52)

#### 1. Native Mobile Horizontal Carousels
To eliminate mobile page scroll fatigue while preserving desktop layout density, TripMind implements two differentiated horizontal scroll carousels on mobile viewports (< 768px):
- **Architecture:** Zero external dependencies. Powered by pure CSS scroll snapping (`overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar`).
- **Peek Affordance:** Cards utilize viewport-percentage widths to reveal a partial edge of the adjacent slide (~16vw–18vw peek), intuitively communicating horizontal affordance without requiring text prompts.
  - *Instructional Carousel (`HowItWorks.jsx`):* `w-[82vw] sm:w-[72vw] md:w-auto`. Compact, instructional, step-badge led with `#C25E3E` terracotta pagination pills.
  - *Destination Discovery Carousel (`DestinationDiscovery.jsx`):* `w-[84vw] sm:w-[75vw] md:w-auto`. Image-focused, 4:3 photograph led with `#173D35` forest green pagination pills.
- **Interactive Slide Indicators:** Dot pagination indicators (`role="tablist"`) update synchronously on touch scroll (`scrollLeft / cardWidth`) and allow direct tap-to-scroll navigation (`scrollIntoView({ behavior: 'smooth', inline: 'center' })`). Dots are cleanly hidden on tablet/desktop viewports (`flex md:hidden`).
- **Viewport Containment:** Employs negative outer margins with compensating internal padding (`-mx-4 px-4 sm:mx-0 sm:px-0`) ensuring cards scroll flush to viewport edges while strictly preventing page-level horizontal overflow (`scrollWidth <= clientWidth`).
- **Desktop/Tablet Preservation:** On tablet and desktop (`md:` breakpoint and above), containers immediately revert to structured CSS grids (`md:grid md:grid-cols-2 lg:grid-cols-5` for How It Works, `md:grid-cols-2 lg:grid-cols-3` for Destinations).

#### 2. Itinerary Destination Imagery Standards
- **Photo Capacity & Resolution:** Supports up to 2 high-resolution destination photographs per itinerary, resolved via `getDestinationPhotos(trip)`.
- **Resolution Hierarchy:**
  1. Explicit trip subdocument array: `trip.destinationImages` (or alias `trip.images`).
  2. Trip cover photograph: `trip.coverImageUrl`.
  3. Curated destination registry: Matches keywords against curated destinations (Kyoto, Swiss Alps, Bali, Manali, Varanasi, Amalfi).
  4. Fallback: Returns empty array `[]` for uncurated/legacy trips without custom images.
- **Trip Detail UI Layout (`TripDetailPage.jsx`):**
  - *2 Images:* Dual-photo plate with responsive `grid-cols-1 sm:grid-cols-2` grid, rounded-xl borders, and subtle gradient captions.
  - *1 Image:* Single-photo plate with 16:10 aspect ratio and rounded-xl borders.
  - *0 Images / Legacy Trips:* Completely omits the image plate container, rendering a clean editorial header with zero empty frames or layout shifts.
  - *Broken URL Resilience:* Implements per-image error tracking (`imageErrors` map). If an image fails to load, gracefully falls back to an editorial Compass icon badge plate without layout collapse.
- **PDF Itinerary Export (`tripPdfExporter.js`):**
  - Renders `.pdf-imagery-gallery` containing `.two-photos` or `.one-photo` grid before day-by-day schedules.
  - Enforces CSS page break avoidance (`break-inside: avoid; page-break-inside: avoid;`).
  - Safe image loading fallback: Includes `onerror="this.parentElement.style.display='none';"` preventing broken image placeholders from appearing in downloaded/printed documents.
  - Preserves Indian Rupee currency glyph (`₹`), full Unicode travel icons (`📍`, `🧭`), and typography across A4 print media.

---

### 5.23 Homepage Storytelling Section, Dedicated About Us Page, and Brand Signature Standards (Day 53)

#### 1. Homepage Storytelling Section ("From Inspiration to Itinerary.")
- **Section Identity & Anchor:** Bound to `id="how-it-works"` with `scroll-mt-20` for backwards-compatible anchor navigation, but renamed from the generic "How to Use TripMind" to **"From Inspiration to Itinerary."** under eyebrow **"The Journey Unfolds"**.
- **Content Streamlining:** Condensed explanatory copy by eliminating repetitive multi-block summaries. Each of the 5 chronological steps features a crisp title, a concise 1–2 sentence narrative (~15–20 words), an editorial micro-badge (`Inspiration`, `Parameters`, `Intelligence`, `Flexibility`, `Exploration`), and 3 concise feature highlights.
- **Desktop Interactive Progression Track (>= 1024px):**
  - Displays a horizontal travel timeline connecting the 5 stages with an interactive terracotta progress line.
  - Numbered node buttons (01 through 05) allow direct jump-to-step activation.
  - Active step card receives elevated focus (`border-terracotta/70 ring-2 ring-terracotta/20 shadow-md bg-white`) and illuminated icon container (`bg-forest text-sand-ivory`).
- **Mobile Horizontal Carousel (< 768px):**
  - Preserves Day 52 native CSS horizontal scroll carousel (`snap-x snap-mandatory scroll-smooth no-scrollbar`).
  - Viewport-proportional card sizing (`w-[82vw] sm:w-[72vw] md:w-auto`) provides natural peek affordance.
  - Synchronized terracotta dot indicators (`role="tablist"`) update on touch scroll and provide tap-to-scroll navigation.
  - Restrained text ensures compact card heights, eliminating vertical mobile scroll fatigue.

#### 2. Dedicated About Us Page Standards (`/about`)
- **Route & Layout Architecture:** Mounted at `/about` wrapped within `<PublicLayout>`, providing seamless sticky header and footer continuity. Fully resilient to direct browser page refresh.
- **Visual Design & Typography:** Adheres strictly to the Warm Ivory (`#F7F5EF`) canvas, Forest Green (`#173D35`) serif headlines, Terracotta (`#D97757`) accents, and Muted Sage (`#D8DFD5`) borders.
- **Atmospheric Destination Plates:** Incorporates curated 4:3 photographic plates (Kyoto, Amalfi Coast, Swiss Alps) with open-access licensing disclosures.
- **Narrative Content Architecture:**
  1. *Executive Mission:* Establishes TripMind's identity as a calm, editorial travel planning platform that unites generative intelligence with spatial clarity and budget realism.
  2. *The Problem & Antidote:* Juxtaposes fragmented 20-tab browsing, geographically blind AI prompts, and unbudgeted travel against TripMind's unified canvas, geographic clustering, and live financial reconciliation.
  3. *Core Capabilities Matrix:* 6 distinct capability cards itemizing Destination Discovery, Intelligent AI Curation, Interactive Leaflet Mapping, Transparent Budget Intelligence, Granular Customization, and Cryptographic Sharing/PDF Export.
  4. *Editorial Philosophy & Ethics:* Highlights literary journal aesthetics (*Cereal*, *Kinfolk*, *Condé Nast Traveler*), traveler autonomy (100% editable itineraries), transparent seasonal estimates, and OpenStreetMap attribution.
  5. *Closing Call to Action:* Dual high-contrast action triggers ("Start Planning Free" and "Browse Destinations") linking into authenticated onboarding.
- **Accessibility & Viewports:** Verified across all 7 standard viewports (320px to 1920px) with strictly zero horizontal overflow (`scrollWidth <= clientWidth`).

#### 3. Brand Signature & Footer Polish Standards (`Footer.jsx`)
- **Brand Signature Sign-Off:** Integrates TripMind's memorable sign-off: `"Ready. Steady. Go."` styled in Playfair Display serif bold italic with a terracotta `Sparkles` icon.
- **Information Architecture & Link Hygiene:**
  - Removed all dead, phantom anchors (`/#itineraries`, `/#budget`).
  - Categorized into 3 logical columns: *Explore* (The Journey, Curated Destinations, My Journal, About TripMind), *Capabilities* (AI Curation, Interactive Mapping, Budget Intelligence, Public Sharing), and *Data & Attribution* (OpenStreetMap attribution with external link icon, session security disclosure).
  - All internal links route via React Router `<Link to="...">`, while section anchors (`/#how-it-works`, `/#destinations`) cleanly navigate from any page.

---

### 5.24 Form Card BorderTrail & Control Hygiene Standards

#### 1. Architectural Placement: Outer Card Perimeter Only
The `BorderTrail` animation is strictly reserved for the **outer perimeter of prominent form card containers** and standalone modal dialogs (`LoginPage`, `RegisterPage`, `CreateTripModal`, `EditTripModal`, `AddActivityModal`, `EditActivityModal`).
- **Never Input-Level:** Prohibited from being applied around individual text inputs, passwords, emails, textareas, search bars, or individual field wrappers.
- **Zero Input Glow:** Strictly eliminates any glowing dots, moving gradient spots, or pulsing highlights behind placeholder text or entered content.

#### 2. Color Harmonization with Primary Button
The `BorderTrail` animation color is synchronized with TripMind's primary button token (`#173D35` / `var(--color-forest)`):
- **Gradient Tokens:** `bg-gradient-to-r from-forest via-[#2E5B3D] to-forest` (utilizing `#2E5B3D` / olive grove as a soft transitional bridge).
- **Restraint:** Bright blue, indigo, or rainbow gradients are strictly banned.

#### 3. Dual-Layer Card Architecture
To prevent gradient bleed into the card's surface:
- **Outer Shell:** `relative rounded-xl p-[1.5px] overflow-hidden bg-sage/80 shadow-[0_12px_40px_rgba(16,45,39,0.35)]` hosting `<BorderTrail size={120} />`.
- **Inner Surface:** `relative z-10 w-full h-full bg-white/95 backdrop-blur-md rounded-[10.5px] p-6 sm:p-8`.
- The inner surface fully covers the interior travel of the motion trail, allowing only the 1.5px border channel to illuminate along the card's outer perimeter.

#### 4. Clean Static Inputs & Brand Focus States
- All input fields retain clean static borders (`border-sage`).
- Focus states utilize TripMind forest green (`border-sage focus:border-forest focus:ring-forest`), removing any misplaced blue rings.









