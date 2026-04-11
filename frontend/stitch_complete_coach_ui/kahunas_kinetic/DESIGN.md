# Design System Specification: Editorial Precision

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Digital Architect."** 

We are moving beyond the standard SaaS dashboard aesthetic into a world of high-end, editorial precision. This system is defined by its architectural use of white space, a rejection of traditional borders, and a sophisticated layering of tonal surfaces. By treating the UI as a series of physical planes rather than a flat digital grid, we create a sense of professional authority and calm. 

The layout utilizes intentional asymmetry and expansive breathing room (using the upper tiers of our spacing scale) to guide the eye, ensuring that every element feels deliberate and premium.

---

## 2. Colors: Tonal Architecture
Our palette transitions from deep, authoritative blues to ethereal, airy neutrals.

### Palette Highlights
*   **Primary (`#0060ab`) & Primary Container (`#3699ff`):** Our signature blues. Use the Primary Container for high-visibility actions to maintain the vibrant, modern energy found in the brand profile.
*   **Surface Tiering:** 
    *   **Surface (`#fbf8ff`):** The foundational base.
    *   **Surface-Container-Low (`#f4f2ff`):** For secondary sectioning.
    *   **Surface-Container-Highest (`#dee1ff`):** For high-priority interactive elements.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** Boundaries must be defined solely through background color shifts or subtle tonal transitions. To separate a sidebar from a main content area, place a `surface-container-low` section against the `surface` background. Lines create visual noise; tonal shifts create atmosphere.

### Glass & Gradient Rule
For primary CTAs and hero states, use a subtle linear gradient transitioning from `primary` to `primary_container` (at a 135-degree angle). This adds "soul" and depth. For floating overlays or navigation headers, apply **Glassmorphism**: use a semi-transparent `surface` color with a `backdrop-blur` of 20px to allow background tones to bleed through.

---

## 3. Typography: Editorial Hierarchy
We utilize a pairing of **Plus Jakarta Sans** for expressive moments and **Inter** for functional clarity, replacing the standard Poppins for a more contemporary, tech-forward feel.

*   **Display & Headlines (Plus Jakarta Sans):** These are your architectural anchors. Use `display-lg` (3.5rem) with tight letter spacing for hero moments. The generous scale conveys confidence.
*   **Titles & Body (Inter):** `body-lg` (1rem) is our workhorse. Inter’s tall x-height ensures readability against complex data.
*   **Labels (Inter):** Use `label-sm` (0.6875rem) in `on_surface_variant` for metadata.

The hierarchy is built on extreme contrast: large, bold headlines paired with small, perfectly tracked labels creates an editorial, high-fashion aesthetic.

---

## 4. Elevation & Depth: Tonal Layering
Depth is not a shadow; depth is a relationship between surfaces.

*   **The Layering Principle:** Stack containers to create hierarchy. A card should be `surface_container_lowest` (#ffffff) sitting on a `surface_container_low` (#f4f2ff) background. This creates a "soft lift" that feels natural and expensive.
*   **Ambient Shadows:** If an element must float (like a dropdown), use a shadow with a 40px blur and 4% opacity, tinted with the `on_surface` color (`#161a30`). Avoid "pure black" shadows at all costs.
*   **The Ghost Border:** If accessibility requires a container edge, use the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Refined Primitives

### Buttons
*   **Primary:** Background: `primary` to `primary_container` gradient. Radius: `md` (0.75rem). Padding: `spacing-3` (top/bottom) by `spacing-6` (left/right).
*   **Secondary:** Background: `secondary_container`. Text: `on_secondary_container`. No border.
*   **Interaction:** On hover, increase the surface elevation by shifting to a slightly higher container tier.

### Input Fields
*   **Style:** Minimalist. Use `surface_container_lowest` as the background.
*   **Borders:** Use the "Ghost Border" (outline-variant @ 20%). 
*   **States:** On focus, the border disappears and is replaced by a 2px `primary` underline or a subtle glow, maintaining the "no-line" philosophy for the container itself.

### Cards & Lists
*   **Layout:** Forbid divider lines. Use `spacing-5` (1.7rem) of vertical white space to separate list items.
*   **Selection:** Use a background shift to `primary_fixed` to indicate an active list item.

### Chips
*   **Visuals:** Pill-shaped (`rounded-full`). Use `secondary_fixed` for a soft, professional look that doesn't compete with primary actions.

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a functional element. If a layout feels "crowded," increase the padding to the next tier in the spacing scale (e.g., move from `8` to `10`).
*   **DO** use `surface_bright` for areas meant to capture the user's immediate focus.
*   **DO** align text-heavy content to a strict baseline grid to maintain the editorial feel.

### Don't
*   **DON'T** use 100% opaque borders to define sections. It breaks the "Digital Architect" flow.
*   **DON'T** use standard drop shadows. Always use the ambient, tinted shadow formula.
*   **DON'T** use `primary` for non-interactive elements. Blue is a signal for action; using it for static icons dilutes its power.
*   **DON'T** crowd the edges. Ensure a minimum of `spacing-8` (2.75rem) from the screen edge for all main content blocks.