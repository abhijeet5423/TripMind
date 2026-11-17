# TripMind — UI Design System & Aesthetic Guide

> **Aesthetic Philosophy:** Premium Editorial Travel Experience  
> **Inspiration:** Literary travel journals, vintage field guides, and print magazines (*Cereal*, *Kinfolk*, *Condé Nast Traveler*).  
> **Anti-Patterns:** Avoid generic dark SaaS dashboards, neon cyan/magenta gradients, over-rounded toy-like buttons, and cluttered widget grids.

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
- Chart colors must align strictly with the brand tokens:
  - **Stay / Lodging:** Forest Green (`#173D35`)
  - **Dining / Food:** Terracotta (`#D97757`)
  - **Activities / Tours:** Ochre Gold (`#C28B38`)
  - **Transit / Travel:** Muted Sage (`#8E9E8A`)
  - **Miscellaneous:** Dark Charcoal (`#242923`)
- Clean tooltips using white background, muted sage border, and sans-serif typography.

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

#### 1. Hero Video Background (`client/src/assets/hero video.mp4`)
- **Asset Location & Identity:** Uses the existing media asset `client/src/assets/hero video.mp4` directly without renaming, replacing, or regenerating assets.
- **Visual Presentation & Natural Color Fidelity:** Rendered as the full-bleed background for the landing page Hero section. Completely eliminates all gradient overlays, dark ambient washes, color tints, opacity layers, and filters over the video. The video is displayed in its original, vibrant natural colors.
- **Native HTML5 Playback:** Pure semantic `<video>` element configured with `autoPlay`, `muted`, `loop`, and `playsInline`.
- **Responsive Layout & Aspect Ratio:** Uses `object-cover object-center` within an `absolute inset-0 w-full h-full` container, maintaining its original 16:9 aspect ratio without distortion or stretching across mobile (375px, 390px), tablet (768px), laptop (1024px), and desktop (1440px) viewports with zero horizontal overflow.
- **Accessibility (`prefers-reduced-motion`) & Fallback:** Actively listens to `(prefers-reduced-motion: reduce)` and handles playback errors (`onError`). When motion is reduced or if video fails to load, gracefully displays the static poster image (`client/src/assets/hero/hero-poster.webp`), which is a matching 1920x1080 WebP keyframe extracted directly from `hero video.mp4` (emerald river canyon gorge) ensuring seamless visual continuity with zero flash.
- **Layout Preservation:** All editorial narrative copy, headlines, primary and secondary CTA buttons, product pillars, and the floating illustrative preview card remain preserved in their exact positions.
- **Master Asset Preservation & Deferred Web Optimization:** The original 3840×2160 (4K UHD) H.265/HEVC video asset (~208.41 MB) is strictly preserved as the master asset. Transcoding to a lightweight H.264 MP4 web delivery version (e.g., 1080p or 720p, ~1.0–3.0 MB) is documented as a deferred performance task for a separate future session.
- **Fresh-Clone Resilience & Optional Glob Resolution:** Resolved via Vite's `import.meta.glob('../../assets/hero video.mp4', { eager: true, import: 'default' })`. When the 208 MB master video is present locally, it plays in 4K UHD. When absent on fresh GitHub clones, Vite compiles and bundles cleanly with zero module-resolution errors, gracefully falling back to the 1920×1080 WebP poster (`hero-poster.webp`) with zero broken media elements or runtime crashes.

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
