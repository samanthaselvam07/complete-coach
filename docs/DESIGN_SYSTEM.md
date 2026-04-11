# Complete Coach — Design System Reference

**Design North Star**: The Kinetic Curator
**Brand**: My Complete Physique (MCP)

---

## Philosophy

Treat user data not as a spreadsheet, but as a premium lifestyle magazine — dynamic, authoritative, and obsessively curated. Intentional asymmetry, tonal layering, and generous whitespace. The interface should feel "expensive," mimicking the tactility of high-end physical hardware.

---

## Color Palette

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#3620b8` | Primary actions, gradient start |
| primary_container | `#4f40cf` | Gradient end, active states, CTAs |
| primary_fixed | `#e3dfff` | Light primary surface |
| primary_fixed_dim | `#c5c0ff` | Dimmed primary |
| secondary | `#9a4600` | Secondary text, accents |
| secondary_container | `#f87600` | Active chips, secondary CTAs, energy accent |
| secondary_fixed | `#ffdbc9` | Light secondary surface |
| secondary_fixed_dim | `#ffb68c` | Dimmed secondary |
| background | `#fbf9f8` | Main canvas |
| surface | `#fbf9f8` | Default surface |
| surface_container_low | `#f5f3f3` | Section backgrounds |
| surface_container | `#efeded` | Mid-level containers |
| surface_container_high | `#e9e8e7` | High-priority interactive |
| surface_container_highest | `#e4e2e2` | Deepest container |
| surface_container_lowest | `#ffffff` | Cards, elevated surfaces |
| surface_dim | `#dbdad9` | Dimmed surfaces |
| surface_bright | `#fbf9f8` | Bright surfaces |
| surface_tint | `#5547d5` | Surface tint overlay |
| on_surface | `#1b1c1c` | Primary text |
| on_surface_variant | `#474554` | Secondary text |
| on_primary | `#ffffff` | Text on primary |
| on_primary_container | `#cfcaff` | Text on primary container |
| on_secondary | `#ffffff` | Text on secondary |
| on_secondary_container | `#562500` | Text on secondary container |
| on_background | `#1b1c1c` | Text on background |
| on_error | `#ffffff` | Text on error |
| on_error_container | `#93000a` | Text on error container |
| on_tertiary | `#ffffff` | Text on tertiary |
| on_tertiary_container | `#cfcfcf` | Text on tertiary container |
| outline | `#787586` | Dividers, disabled |
| outline_variant | `#c8c4d7` | Ghost borders |
| error | `#ba1a1a` | Error states |
| error_container | `#ffdad6` | Error backgrounds |
| inverse_surface | `#303031` | Inverted surfaces |
| inverse_primary | `#c5c0ff` | Inverted primary |
| inverse_on_surface | `#f2f0f0` | Text on inverted surface |
| tertiary | `#414141` | Tertiary accent |
| tertiary_container | `#585858` | Tertiary backgrounds |

### Dark Mode
| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#c5c0ff` | Primary actions (dark) |
| primary_container | `#3c29bd` | Gradient end (dark) |
| secondary | `#ffb68c` | Secondary accent (dark) |
| secondary_container | `#753400` | Active chips (dark) |
| background | `#131316` | Main canvas (dark) |
| surface | `#1b1c1c` | Default surface (dark) |
| surface_container_low | `#1f2020` | Section backgrounds (dark) |
| surface_container | `#242525` | Mid containers (dark) |
| surface_container_high | `#2e2f2f` | High-priority (dark) |
| surface_container_highest | `#39393a` | Deepest container (dark) |
| surface_container_lowest | `#131316` | Cards (dark) |
| on_surface | `#e4e2e2` | Primary text (dark) |
| on_surface_variant | `#c8c4d7` | Secondary text (dark) |

---

## Typography

| Role | Font | Weight | Size Range |
|------|------|--------|------------|
| Display | Plus Jakarta Sans | 800 (ExtraBold) | 2.5rem–3.5rem, tight tracking |
| Headline | Plus Jakarta Sans | 700 (Bold) | 1.5rem–2rem |
| Title | Plus Jakarta Sans | 600 (SemiBold) | 1.125rem–1.25rem |
| Body | Inter | 400–500 (Regular–Medium) | 0.875rem–1rem |
| Label | Inter | 500–600 (Medium–SemiBold) | 0.6875rem–0.75rem |

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| spacing-0 | 0 | None |
| spacing-1 | 0.25rem (4px) | Tight gaps |
| spacing-2 | 0.5rem (8px) | Icon gaps |
| spacing-3 | 0.75rem (12px) | Button padding (vertical) |
| spacing-4 | 1rem (16px) | Standard padding |
| spacing-5 | 1.7rem (27px) | List item separation |
| spacing-6 | 1.5rem (24px) | Card internal padding |
| spacing-8 | 2.75rem (44px) | Section margins |
| spacing-10 | 3.5rem (56px) | Large section gaps |
| spacing-12 | 4.25rem (68px) | Hero spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| DEFAULT | 0.25rem | Small elements |
| lg | 0.5rem | Medium elements |
| xl | 1.5rem | Cards, buttons, panels |
| full | 9999px | Pills, chips, avatars |

---

## Elevation & Depth Rules

### The "No-Line" Rule
**Never use 1px solid borders for sectioning.** Use:
- Surface shifts (`surface_container_low` against `background`)
- Tonal transitions (background color blocks)
- Ghost borders (`outline_variant` at 15% opacity) only when absolutely needed

### Glassmorphism
- Semi-transparent `surface` with `backdrop-blur: 20px`
- Use for: navigation bars, modal overlays, floating action areas
- Spec: `background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px);`

### Gradient CTAs
- Primary buttons: linear-gradient(135deg, `primary` → `primary_container`)
- Secondary buttons: `secondary_container` fill, no border

### Ambient Shadows
- Floating elements: `0px 10px 30px rgba(27, 28, 28, 0.06)`
- **Never pure black** — always tinted with `on_surface`
- Diffuse, large blur (40px+ for modals)

### Surface Layering
- Base: `background` (#fbf9f8)
- Section: `surface_container_low` (#f5f3f3)
- Interactive card: `surface_container_lowest` (#ffffff) — creates "soft lift"
- Hierarchy is created by stacking lighter on darker, never lines

---

## Components

### Buttons
| Variant | Style | Interaction |
|---------|-------|-------------|
| Primary | Gradient fill (primary → primary_container), xl radius, white text | Scale 0.98 on press |
| Secondary | Glassmorphic fill (low-opacity surface), ghost border | Surface elevation shift on hover |
| Icon | Circular, surface background, icon centered | Scale 0.95 on press |

### Cards ("Physique" Cards)
- No dividers — use `spacing-6` (1.5rem) or background shifts
- `xl` corners (1.5rem)
- `surface_container_lowest` background
- Asymmetric padding (more top/bottom for editorial feel)
- Ambient shadow for floating cards

### Input Fields
- Background: `surface_container_high` — soft-filled, no borders
- Focus: ghost-border at `primary` 20% opacity + slight elevation
- Error: `error_container` background, `on_error_container` text

### Chips
- Shape: `full` radius (pill)
- Unselected: `surface_container_high` background
- Selected: `secondary_container` (#f87600) — energy accent
- Text on selected: `on_secondary` (#ffffff)

### Progress Glass
- Custom progress tracker
- Background: frosted glass (glassmorphism)
- Progress fill: gradient `secondary` → `secondary_container`
- Appears to "glow" within container

### Navigation (Coach Desktop)
- Fixed left sidebar, 256px wide
- Glass panel: `bg-white/70 backdrop-blur-xl`
- Logo + org name at top
- Coach avatar + role below
- Nav items (top to bottom, in order):
  1. Dashboard (`/coach`)
  2. Clients (`/coach/clients`)
  3. Training (`/coach/programs` — includes Programs, Workouts, Calendar)
  4. Nutrition (`/coach/nutrition` — includes Meal Plans, Food Database)
  5. Supplementation (`/coach/supplements` — includes Supplement Hub, Protocols)
  6. Education (`/coach/vault` — includes Vault, Form Builder)
  7. Team (`/coach/team`)
  8. Social Scheduling (`/coach/social` — includes Social Calendar, Content Planning)
  9. Finance (`/coach/financials` — includes Analytics, Payments)
  10. Packages (`/coach/packages`)
  11. Forms (`/coach/forms` — includes Form Builder, Check-in Management)
- Nav items: icon + label, active state = white card with ambient shadow
- Collapsible to icon-only
- Settings and Profile accessible via avatar dropdown at bottom

### Navigation (Client Mobile)
- Bottom tab bar (6 items)
- Glass panel with backdrop blur
- Active tab: `secondary_container` accent
- Safe area padding for iOS
- Tab items (left to right, in order):
  1. Dashboard (`/client`) — icon: `space_dashboard`
  2. Training (`/client/training`) — icon: `fitness_center`
  3. Nutrition (`/client/nutrition`) — icon: `restaurant_menu`
  4. Supplementation (`/client/supplements`) — icon: `medication`
  5. Education (`/client/education`) — icon: `school`
  6. Progress (`/client/progress`) — icon: `trending_up`
- Additional pages (Calendar, Check-ins, Messages, Settings) accessible via top bar or within tabs

### Top Bar
- Glass panel: `bg-white/70 backdrop-blur-xl`
- Logo left, actions right (notifications, profile)
- Mobile: hamburger menu replaces sidebar

---

## Animation & Motion
- Page transitions: `ease-in-out`, 200ms
- Hover states: `transition-all duration-200`
- Press/active: `scale-[0.98]`, 100ms
- Modal/overlay: fade + translate, 300ms
- Avoid jarring animations — everything should feel "expensive" and deliberate

---

## Responsive Breakpoints
| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Bottom tab nav, single column, stacked cards |
| Tablet | 768–1024px | Collapsible sidebar, 2-column grid |
| Desktop | > 1024px | Full sidebar, multi-column layouts |

---

## Do's and Don'ts

### Do
- Use whitespace as a functional tool — if busy, increase spacing
- Use `full` radius for pills, tags, status indicators
- Use high-quality photography of athletes/food
- Stack lighter surfaces on darker for hierarchy
- Use glassmorphism for floating/overlay elements
- Use gradient CTAs for primary actions

### Don't
- Use `#000000` for text — use `on_surface` (#1b1c1c) instead
- Use sharp corners — minimum `DEFAULT` (0.25rem) radius
- Use standard drop shadows — always customize blur/spread
- Use 1px solid borders for sectioning
- Use `primary` for non-interactive elements
- Crowd edges — minimum `spacing-8` (2.75rem) from screen edge
