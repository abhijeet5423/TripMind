# TripMind — Global UI Motion Guidelines

> **Status:** ACTIVE & MANDATORY (Implemented & Verified — See ADR-027)  
> **Applies to:** All frontend developers, UI contributors, and AI coding agents working on TripMind.  
> **Implementation Location:** `client/src/components/core/`  
> **Aesthetic Philosophy:** Premium, Calm, Modern, Trustworthy, and Purposeful Motion.  
> **Anti-Pattern:** Never turn TripMind into an animation-effects showcase or gimmick demo.

---

## 1. Executive Summary & Purpose

TripMind is an AI-powered travel planning platform designed around a thoughtful, literary editorial aesthetic (inspired by field journals, *Cereal*, *Kinfolk*, and *Condé Nast Traveler*). Planning journeys requires focus, spatial comprehension, financial clarity, and emotional calm.

Motion in TripMind is **functional choreography**, not decorative amusement. The objective is **never to maximize animations**, but to introduce purposeful, restrained movement that:
- Confirms user intent and clarifies interface feedback.
- Guides spatial orientation across viewports and routing states.
- Reinforces the tactile, paper-and-field-journal aesthetic without sacrificing speed.
- Respects accessibility standards and device performance constraints.

If an animation does not improve usability, communicate state, or reduce cognitive load, **it must be omitted**.

---

## 2. Global Motion Philosophy

All UI motion in TripMind must strictly adhere to these ten foundational principles:

1. **Motion Must Have a Purpose:** Every movement must serve a functional purpose—communicating state change, directing focus, confirming action, or easing spatial navigation. Motion without clear utility is visual noise.
2. **Prefer Subtle Animations Over Dramatic Effects:** Animations should feel quiet, natural, and refined. Favor small translational shifts (2–4px), gentle opacity dissolves, and restrained springs over aggressive bounces, oversized zooms, or theatrical spins.
3. **Never Animate Multiple Prominent Elements Simultaneously:** Avoid competing animations within the same viewport. Simultaneous motion creates cognitive fatigue, obscures content hierarchy, and disorients users.
4. **Preserve Content Readability and Interaction Clarity:** Text, form inputs, pricing summaries, and travel itineraries must remain readable throughout any transition. Never obscure interactive controls or text during movement.
5. **Avoid Unnecessary Continuous Animations:** Eliminate infinite looping animations, flashing elements, or persistent pulsing indicators unless directly communicating an active background operation (e.g., a quiet indeterminate loading spinner).
6. **Use Consistent Easing and Timing:** Motion across the entire application must share cohesive timing curves and physical characteristics. Standard interactions share uniform duration tiers and easing functions.
7. **Respect Accessibility and Reduced-Motion Preferences:** Honor the user's operating system preferences (`prefers-reduced-motion: reduce`). All animated components must provide immediate, high-fidelity static fallbacks.
8. **Prioritize Performance on Mobile Devices:** Mobile devices possess smaller battery capacities, varying CPU throttles, and touch-first interaction paradigms. Animations must maintain solid 60fps performance and gracefully degrade on low-power hardware.
9. **Animations Must Never Interfere With Functionality:** Motion must never block user input, delay critical event handlers, or introduce race conditions in asynchronous data submission.
10. **Avoid the "Showcase" Trap:** TripMind is a travel companion, not a portfolio showcase for animation libraries. Keep transitions understated, premium, and calm.

---

## 3. Approved Animation Inventory

The following reusable motion patterns and component specifications represent the catalog of approved animations across TripMind. Any animation introduced outside this inventory requires review under Section 8.

```
+-----------------------------------------------------------------------------------+
|                            TRIPMIND MOTION CATALOG                               |
+---------------------+-------------------------------+-----------------------------+
| Component / Pattern | Target Interface Surface      | Primary Motion Mechanics    |
+---------------------+-------------------------------+-----------------------------+
| AnimatedBackground  | Desktop Navbar Navigation     | 300ms spring hover pill     |
| BorderTrail (Card)  | Selected Dashboard Hero Cards | Restrained brand border run |
| BorderTrail (Form)  | Active Input Focus Rings      | Single-pass focus highlight |
| TextEffect          | Landing Hero Heading          | One-time staggered entrance |
| ScrollProgress      | Landing & Itinerary Views     | 2-3px viewport progress bar |
| Tilt                | Destination Discovery Cards   | 4-5 deg cursor-driven tilt  |
| Section Reveals     | Editorial Content Blocks      | 300-500ms subtle fade-up    |
+---------------------+-------------------------------+-----------------------------+
```

---

### A. Animated Navbar Hover Background

- **Reference Component:** `AnimatedBackground`
- **Application Target:** Primary desktop website navigation bar (`Navbar.jsx`).
- **Functional Purpose:** Provides continuous spatial fluidity as the traveler glances and moves their cursor across top-level navigation items (`How It Works`, `Destinations`, `Itineraries`, `About`).
- **Motion Behavior:**
  - Moves a soft, rounded pill background smoothly beneath the hovered navigation item.
  - Utilizes a gentle spring physics transition (~300ms settle duration) with minimal overshoot.
  - Uses the warm brand tone `bg-sand-ivory/80` or `bg-forest/5` against light surfaces, or `bg-white/10` over dark hero surfaces.
  - **Preserves Active State:** The persistent active route indicator (terracotta underline / active badge) remains completely distinct and unaffected by the hover pill.
- **Device Gating:** Active only on pointer-capable devices (`@media (hover: hover) and (pointer: fine)`). Completely disabled on touch screens.
- **Motion Intensity:** **Low**.

---

### B. Dashboard Card BorderTrail

- **Reference Component:** `BorderTrail`
- **Application Target:** Prominent, featured noticeboard cards (e.g., active trip planning card or primary dashboard CTA).
- **Functional Purpose:** Subtle ambient framing that distinguishes a high-priority card from surrounding static travel notes on the tactile corkboard.
- **Restraint Rules:**
  - **Selective Application:** Applied to **at most one** prominent card in the dashboard view.
  - **Never Mass-Applied:** Prohibited on standard grid cards, lists, or repeated itinerary cards.
  - **Color Harmony:** Employs brand-compatible palette tones (`--color-terracotta` or `--color-forest`), never harsh neon cyan or rainbow gradients.
  - **Velocity:** Gentle, slow traversal cycle ($\ge 6\text{s}$ per loop) with low trail opacity (20–40%) to prevent peripheral distraction.
- **Motion Intensity:** **Low to Medium**.

---

### C. Animated Form Borders

- **Reference Component:** `BorderTrail` / Focused Field Micro-Choreography
- **Application Target:** Interactive form input fields across modals and authentication forms (`CreateTripModal`, `EditTripModal`, `LoginPage`, `RegisterPage`).
- **Functional Purpose:** Confirms active focus state and guides the traveler's attention to the active typing field.
- **Behavioral Rules:**
  - **Focus-Triggered Only:** Animates once upon element focus (`:focus-within`). Inactive fields remain strictly static.
  - **Validation Precedence:** Form validation and semantic feedback take absolute priority:
    - **Error State:** Border instantly transitions to static `border-burnt-crimson` with accessible error text. The animation is immediately suppressed.
    - **Success State:** Border reflects static `border-olive-grove`.
    - **Disabled State:** Border reflects static muted `border-sage/40`.
- **Motion Intensity:** **Low**.

---

### D. Hero Heading TextEffect

- **Reference Component:** `TextEffect`
- **Application Target:** Primary landing page hero title (*"Mindful Travel, Thoughtfully Planned"*).
- **Functional Purpose:** Sets an elevated, literary tone upon initial visit, echoing the ink-on-paper feeling of opening a handcrafted travel journal.
- **Motion Mechanics:**
  - Character-by-character or word-by-word staggered entrance.
  - Subtle 3D rotation (around the X-axis: 10–15deg) combined with gentle upward translation (8–12px) and opacity fade.
  - Character stagger interval: $\le 40\text{–}50\text{ms}$.
  - Total sequence duration: $\le 800\text{ms}$.
- **Execution Discipline:**
  - **One-Time Only:** Executes strictly once on initial page mount.
  - **No Re-Triggering:** Prohibited from replaying on scroll, component re-render, or tab switching.
  - **Mobile Adaptation:** If device width is $< 768\text{px}$, transitions to a simple word-level fade without complex 3D transforms.
- **Motion Intensity:** **Medium (One-time only)**.

---

### E. Scroll Progress Indicator

- **Reference Component:** `ScrollProgress`
- **Application Target:** Landing page editorial narrative and multi-day itinerary reading views (`TripDetailPage.jsx`).
- **Functional Purpose:** Provides unobtrusive spatial orientation during long-form itinerary exploration, indicating how much of the curated journey remains.
- **Specifications:**
  - Thin horizontal indicator bar pinned to the viewport header boundary.
  - Height: strictly **2–3px**.
  - Color: Terracotta accent (`--color-terracotta`) with semi-transparent background track.
  - **Viewport Container Alignment:** Accurately tracks the scrolling container (`window` for landing page, scrollable view container for dashboard/itinerary modals).
  - Smooth hardware-accelerated `scaleX` transform anchored to `origin-left`.
- **Motion Intensity:** **Minimal**.

---

### F. Destination Card 3D Tilt

- **Reference Component:** `Tilt`
- **Application Target:** Curated destination discovery cards (`DestinationCard.jsx`).
- **Functional Purpose:** Adds subtle physical depth to curated destination photography, suggesting tactile paper postcards.
- **Specifications & Safeguards:**
  - **Restrained Rotation Factor:** Maximum rotation angle capped at **4–5 degrees** (`maxTilt: 5`). Extreme angles are strictly prohibited.
  - **Pointer Gating:** Strictly active only on pointer-capable desktop devices (`@media (hover: hover) and (pointer: fine)`).
  - **Touch Safeguard:** Completely disabled on mobile and tablet touch devices to avoid gesture hijacking and unexpected layout shifting during vertical scrolling.
  - Smooth spring reset when the cursor leaves the card perimeter.
- **Motion Intensity:** **Low**.

---

### G. Scroll-Triggered Section Reveals

- **Reference Pattern:** Subtle IntersectionObserver Fade-Up Choreography
- **Application Target:** Homepage discovery sections, editorial pillars, and dashboard section transitions.
- **Functional Purpose:** Smooths content discovery as the user reads down the page, eliminating abrupt pop-in without delaying reading.
- **Specifications:**
  - Opacity transition: `0 -> 1`.
  - Vertical translation: subtle **8–16px** (`translateY(12px) -> translateY(0)`).
  - Duration: **300–500ms** with standard `cubic-bezier(0.16, 1, 0.3, 1)` easing.
  - Stagger interval for child cards: **50–80ms** per sibling.
  - **Trigger Discipline:** Configured with `once: true`. Once revealed, elements stay in place; they never fade out or re-animate when scrolling backward.
  - Intersection threshold: activates when **10–15%** of the section enters the viewport.
- **Motion Intensity:** **Low**.

---

## 4. Global Timing & Easing Guidelines

To preserve visual rhythm, all animations in TripMind must draw from standardized duration and easing tiers:

### 4.1 Duration Tiers

| Motion Classification | Recommended Duration | Usage Context & Examples |
| :--- | :--- | :--- |
| **Instant / Micro Interaction** | **150–200ms** | Button active states, icon toggles, dropdown arrows. |
| **Standard Interaction** | **200–250ms** | Hover state transitions, input focus rings, tooltip reveals. |
| **Spring Fluid Movement** | **250–350ms** | Navbar hover background pill, modal sheet appearances. |
| **Section & Card Reveal** | **300–500ms** | Staggered card reveals, content block entrances. |
| **Character / Item Stagger** | **40–50ms** | Stagger offset between sibling items or letters. |
| **Subtle Position Shift** | **2–4px** | Physical button depression, card hover elevation. |

> [!WARNING]
> **Prohibition of Slow Animations:** Animations exceeding **500ms** (except ambient background trails or one-time landing titles) make interfaces feel sluggish and unresponsive. Never make a traveler wait for an animation to complete before they can interact.

### 4.2 Standard Easing Curves

```css
/* 1. Natural Deceleration (Standard UI entrances, modals, reveals) */
--ease-out-editorial: cubic-bezier(0.16, 1, 0.3, 1);

/* 2. Responsive Acceleration-Deceleration (Hover states, tab transitions) */
--ease-in-out-smooth: cubic-bezier(0.4, 0, 0.2, 1);

/* 3. Tactile Spring (Navbar indicator, card resets) */
--spring-tactile: { tension: 320, friction: 28 };
```

---

## 5. Animation Hierarchy & Viewport Budgeting

TripMind organizes motion into four distinct structural levels to prevent cognitive overload:

```
+-----------------------------------------------------------------------------------+
|                            ANIMATION HIERARCHY                                    |
+-----------------------------------------------------------------------------------+
| Level 4: Signature Motion     Main Hero Heading TextEffect (One-time, isolated)   |
| Level 3: Content Motion       Section reveals, Postcard Tilt, Map pin drops       |
| Level 2: Micro-Interactions   Navbar hover pill, button presses, card elevation   |
| Level 1: Functional Motion    Scroll progress, focus outlines, loading indicators |
+-----------------------------------------------------------------------------------+
```

### Viewport Budgeting Rules
- **Level 1 (Functional Motion):** Always allowed; provides direct spatial and accessibility utility.
- **Level 2 (Micro-Interactions):** Always allowed; localized to individual hovered or activated components.
- **Level 3 (Content Motion):** Permitted during viewport scrolling, but must be staggered sequentially, never triggered simultaneously.
- **Level 4 (Signature Motion):** **Strictly isolated.** Level 4 signature animations may **never** compete with other prominent animations in the same viewport. When the Hero heading is animating, all surrounding elements (cards, icons, pillars) must remain static until the signature motion concludes.

---

## 6. Accessibility & Inclusivity (Mandatory)

Motion must never compromise accessibility. TripMind enforces full compliance with **WCAG 2.2 Success Criterion 2.2.2 (Pause, Stop, Hide)** and **Success Criterion 2.3.1 (Three Flashes or Below Threshold)**:

### 6.1 Strict `prefers-reduced-motion` Enforcement
- **CSS-Level Safeguard:** The application-wide override in `client/src/index.css` instantly neutralizes animations:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
- **JavaScript Component Safeguard:** Interactive motion components (Framer Motion / Motion Primitives) must verify user preferences programmatically:
  ```javascript
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ```
  When `true`, components must bypass transition states and mount directly in their final resolved layout.

### 6.2 Zero Information Masking
- Essential information (trip destinations, prices, departure dates, validation error messages) must **never be hidden behind motion triggers**.
- Information must be accessible immediately in the static DOM.

### 6.3 Focus Ring Visibility
- Animation must never obscure, shrink, or hide native keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-forest`).
- Interactive elements must retain clear visual focus indicators at all times.

### 6.4 Touch & Hover Independence
- All functionality accessible via hover motion must be equally operable through direct keyboard interaction and touch events.
- Never require hover movement to reveal critical actions (e.g., delete trip, share itinerary, edit activity).

---

## 7. Performance & Engineering Standards

Fluid 60fps rendering is essential for a trustworthy, premium experience. Follow these technical requirements:

1. **Composite-Only Properties:** Animate exclusively GPU-accelerated CSS properties:
   - `transform` (`translate3d`, `scale`, `rotate`)
   - `opacity`
2. **Never Animate Layout Properties:** Strictly prohibit animating geometry properties that trigger reflow (layout recalculation) and repaint:
   - ❌ `width`, `height`, `top`, `left`, `bottom`, `right`, `margin`, `padding`, `border-width`.
3. **Limit Active Nodes:** Avoid animating more than **4–6 concurrent DOM nodes** simultaneously.
4. **Lifecycle Cleanup:**
   - Always disconnect `IntersectionObserver`, `ResizeObserver`, and scroll event listeners in React `useEffect` cleanup routines.
   - Cancel animation frame requests (`cancelAnimationFrame`) on component unmount.
5. **Mobile Viewport Discipline:**
   - Disable computationally heavy shaders, multi-layer blurs, or continuous SVG filters on viewports $< 768\text{px}$.
   - Default mobile devices to lightweight CSS transitions over complex JavaScript physics engines.
6. **Zero Dependency Overhead:**
   - Prefer modern CSS `@keyframes` and native Tailwind transitions.
   - When motion libraries are integrated, ensure tree-shaking is preserved and bundle overhead does not compromise First Contentful Paint (FCP) or Largest Contentful Paint (LCP).

---

## 8. Future Animation Approval Process

Before any new animation, micro-interaction, or motion library is integrated into TripMind, the developer or AI agent must verify and document adherence to the following six criteria:

1. **Clear Purpose:** The animation directly improves comprehension, feedback, or spatial navigation.
2. **Visual Hierarchy Alignment:** Fits within Level 1–4 hierarchy without competing with existing viewport elements.
3. **Timing & Easing Compliance:** Conforms to Section 4 duration tiers and easing curves.
4. **Accessibility Verified:** Verified against `prefers-reduced-motion` and keyboard accessibility.
5. **Zero Redundancy:** Does not duplicate an existing approved pattern from Section 3.
6. **Pre-Implementation Documentation:** Recorded in `DEVELOPMENT_LOG.md` and cross-referenced with `UI_DESIGN_SYSTEM.md` prior to merging.

---

## 9. Related Documentation & Governance

This document operates in direct harmony with the core TripMind documentation suite:
- [`PROJECT_RULES.md`](./PROJECT_RULES.md) — Operational boundaries, architectural constraints, and verification requirements.
- [`UI_DESIGN_SYSTEM.md`](./UI_DESIGN_SYSTEM.md) — Color palette, serif/sans typography tokens, container rules, and component styles.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Full-stack system structure, layer separation, and API contracts.
- [`DECISIONS.md`](./DECISIONS.md) — Architectural Decision Records (ADRs).
- [`DEVELOPMENT_LOG.md`](./DEVELOPMENT_LOG.md) — Chronological history of implementation and audit milestones.
