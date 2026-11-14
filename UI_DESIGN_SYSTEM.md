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
