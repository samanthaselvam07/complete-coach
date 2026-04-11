# Design System Document

## 1. Overview & Creative North Star: "The Kinetic Curator"

This design system is engineered to elevate the fitness experience from a mere utility to a high-end editorial journey. Moving away from the "cluttered dashboard" trope, we embrace **The Kinetic Curator** as our North Star. This philosophy treats user data not as a spreadsheet, but as a premium lifestyle magazine—dynamic, authoritative, and obsessively curated.

We break the standard grid by utilizing **intentional asymmetry** and **tonal layering**. Large, expressive typography scales create a clear editorial hierarchy, while generous whitespace ensures that the brand's bold energy (#FF7900 and #4F40CF) feels like a deliberate accent rather than a chaotic noise. The interface should feel "expensive," mimicking the tactility of high-end physical hardware and the fluidity of a modern OS.

---

## 2. Colors: Tonal Depth & Radiant Accents

Our palette transitions the brand's raw energy into a sophisticated digital ecosystem. We prioritize eye comfort and spatial clarity over harsh boundaries.

### The "No-Line" Rule
To achieve a premium, seamless aesthetic, **1px solid borders are strictly prohibited** for sectioning or containment. Boundaries must be defined through:
- **Surface Shifts:** Using `surface-container-low` components against a `background` fill.
- **Tonal Transitions:** Defining logic groups via soft background color blocks rather than structural lines.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Use the following hierarchy to "stack" importance:
- **Base:** `background` (#fbf9f8) for the main canvas.
- **Sectioning:** `surface-container-low` (#f5f3f3) for broad content areas.
- **Interaction Hubs:** `surface-container-lowest` (#ffffff) for primary interactive cards, creating a "soft lift" against the warmer background.

### The "Glass & Gradient" Rule
- **Glassmorphism:** For floating elements (navigation bars, modal overlays), use semi-transparent `surface` colors with a `backdrop-blur` of 20px–40px. This ensures the vibrant brand colors bleed through, creating a sense of environmental depth.
- **Signature Textures:** Main CTAs must utilize a subtle linear gradient from `primary` (#3620b8) to `primary_container` (#4f40cf). This prevents the "flat-button" look and provides a tactile, "pressable" soul to the UI.

---

## 3. Typography: Editorial Authority

We utilize **Plus Jakarta Sans** for high-impact display moments and **Inter** for clinical, high-readability data.

*   **Display (Plus Jakarta Sans):** Used for "Welcome" states and major progress milestones. These should feel like magazine headlines—bold, tight tracking, and commanding.
*   **Headline & Title (Plus Jakarta Sans):** These guide the user through their workout and nutrition pillars. They bridge the gap between "sporty" and "luxury."
*   **Body & Label (Inter):** Reserved for technical instructions, nutritional data, and secondary metadata. 

The contrast between the wide, modern display faces and the functional body text creates a "pro-performance" aesthetic that mirrors high-end fitness apparel.

---

## 4. Elevation & Depth: Tonal Layering

We avoid the "card-on-gray" cliché by using naturalistic light physics.

*   **The Layering Principle:** Depth is achieved by placing lighter surfaces on darker ones. An active workout card (`surface-container-lowest`) sits atop a `surface-container-low` dashboard, creating visual prominence without a single shadow.
*   **Ambient Shadows:** For floating elements like Action Buttons, use extra-diffused shadows.
    *   *Spec:* `0px 10px 30px rgba(27, 28, 28, 0.06)`. 
    *   Shadows must never be pure black; they should be a low-opacity tint of `on-surface` to mimic natural ambient light.
*   **The "Ghost Border" Fallback:** If a container requires definition against a similarly colored background, use a `ghost-border`: `outline-variant` at **15% opacity**. This provides a whisper of structure without the "boxiness" of standard UI.

---

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_container`), `xl` roundedness (1.5rem), white text.
*   **Secondary:** Glassmorphic fill (low-opacity `surface`) with a `ghost-border`.
*   **Interactive State:** On hover/press, apply a subtle scale-down (0.98) to mimic physical resistance.

### Cards (The "Physique" Card)
*   **Strict Rule:** No dividers. Separate content using `spacing-6` (1.5rem) or subtle background shifts.
*   **Style:** `xl` corners (1.5rem), `surface-container-lowest` background, ambient shadow. Use asymmetric padding (more on top/bottom) to emphasize editorial layout.

### Input Fields
*   **State:** Soft-filled `surface-container-high` backgrounds with no borders.
*   **Focus:** Transition to a `primary` ghost-border (20% opacity) and a slight elevation lift.

### Chips
*   **Filter/Selection:** Use `lg` roundedness. Unselected chips should be `surface-container-high`; selected chips use the signature `secondary_container` (#f87600) to pull from the high-energy orange brand identity.

### Additional Component: The "Progress Glass"
A custom progress tracker using a high-blur backdrop. The progress bar itself should be a gradient of `secondary` to `secondary_container`, appearing to "glow" within a frosted glass container.

---

## 6. Do's and Don'ts

### Do
*   **DO** use whitespace as a functional tool. If a screen feels "busy," increase the spacing between logic blocks using `spacing-10` or `spacing-12`.
*   **DO** use `full` roundedness (9999px) for pill-shaped elements like tags and status indicators to maintain the "Apple-like" softness.
*   **DO** prioritize high-quality, professional photography of athletes/food. The UI is the frame; the content is the art.

### Don't
*   **DON'T** use 100% black (#000000) for text. Use `on-surface` (#1b1c1c) to maintain a premium, softer contrast.
*   **DON'T** use sharp corners. Every element should feel ergonomic and "hand-friendly" using at least the `DEFAULT` (0.5rem) scale.
*   **DON'T** use standard "Drop Shadows" from a library. Always customize the blur and spread to be significantly larger and softer than the default.