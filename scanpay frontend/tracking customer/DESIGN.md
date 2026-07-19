---
name: Voltage Mono
colors:
  surface: '#111222'
  surface-dim: '#111222'
  surface-bright: '#37384a'
  surface-container-lowest: '#0c0d1d'
  surface-container-low: '#1a1a2b'
  surface-container: '#1e1e2f'
  surface-container-high: '#28283a'
  surface-container-highest: '#333345'
  on-surface: '#e2e0f8'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e2e0f8'
  inverse-on-surface: '#2e2f41'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#ffffff'
  on-secondary: '#2b3400'
  secondary-container: '#cdf200'
  on-secondary-container: '#5a6b00'
  tertiary: '#c8c6c5'
  on-tertiary: '#313030'
  tertiary-container: '#929090'
  on-tertiary-container: '#2a2a29'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#cdf200'
  secondary-fixed-dim: '#b4d400'
  on-secondary-fixed: '#181e00'
  on-secondary-fixed-variant: '#3f4c00'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474646'
  background: '#111222'
  on-background: '#e2e0f8'
  surface-variant: '#333345'
typography:
  display:
    fontFamily: Syne
    fontSize: 84px
    fontWeight: '800'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Syne
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Syne
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.1'
  headline-md:
    fontFamily: Syne
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-bold:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.0'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
spacing:
  base: 8px
  margin-mobile: 20px
  margin-desktop: 64px
  gutter: 24px
  section-gap: 120px
---

## Brand & Style
The design system is a high-energy fusion of Neo-Brutalism and Minimalist Tech, specifically engineered for a Gen Z audience. It rejects the polite constraints of corporate design in favor of raw, high-contrast digital expression.

The aesthetic is defined by "tactile digitalism"—combining flat, bold shapes with textured gradients and glassmorphic overlays. It evokes an emotional response of confidence, immediacy, and "online-native" technical literacy. The style relies on heavy 2px borders, intentional use of "ink" blacks, and a vibrant, acidic color palette to create a high-impact visual rhythm that feels both premium and unpolished.

## Colors
This design system utilizes a high-contrast palette built on a dark mode foundation. 

- **Primary (Electric Violet):** Used for core branding and primary actions. It should feel radioactive and saturated.
- **Secondary (Lime Green):** Reserved for high-priority accents, success states, and interactive highlights.
- **Surface (Deep Ink Black):** The base background (#121212), providing a deep, non-neutral void that makes colors pop.
- **Soft Lavender:** Used for secondary surfaces and glassmorphic background blurs to soften the technical edge.
- **Borders & Outlines:** Always use absolute black (#000000) for structural borders to maintain the Neo-Brutalistic "comic book" definition.

## Typography
The typography strategy plays on the tension between "Expression" and "Instruction."

**Syne** is used for all headers. It should be set with tight leading and negative letter spacing to create dense, impactful blocks of text. For display sizes, use the "Extra Bold" weight to maximize the brutalist impact.

**JetBrains Mono** is used for all functional text, including body copy, UI labels, and data. This introduces a technical, "under-the-hood" vibe that feels honest and precise. All body text should maintain generous line heights for readability against the dark, high-contrast background.

## Layout & Spacing
The design system uses a **fixed grid** model for desktop and a **fluid grid** for mobile.

- **Desktop:** 12-column grid with a max-width of 1440px. Gutters are kept at a generous 24px to prevent the high-contrast elements from feeling cluttered.
- **Mobile:** 4-column fluid grid with 20px side margins.
- **Spacing Philosophy:** Use an 8px base unit. To emphasize the "Bold" vibe, whitespace between sections should be exaggerated (120px+), while internal component padding remains tight and efficient. Elements often "break" the grid slightly with offset shadows or overlapping borders.

## Elevation & Depth
Depth in this design system is created through **Glassmorphism** and **Hard Shadows**, rather than realistic lighting.

1.  **The Glass Layer:** Cards and overlays use a semi-transparent Soft Lavender fill (approx. 10-15% opacity) with a heavy backdrop blur (20px-40px). This "frosted" effect sits on top of grainy, moving gradients to create a sense of multi-dimensional space.
2.  **Hard Elevation:** Instead of soft shadows, use "Neo-Shadows"—solid black offsets (e.g., 4px 4px) with 0% blur. This makes components feel like physical cutouts or stickers.
3.  **Tonal Stacking:** Use the deep ink black for the base, and slightly lighter grays for nested containers to establish a clear structural hierarchy.

## Shapes
The shape language is a deliberate study in contradictions. 

Containers, cards, and input fields must have **sharp 0px corners** and 2px solid black borders. This provides the "Brutalist" structure. 

In contrast, all **interactive buttons and chips must be Pill-shaped (fully rounded)**. This distinction creates a clear mental model: sharp = content/structure, rounded = action/interactivity. Every shape should be treated as a distinct layer with a clear 2px black stroke.

## Components
- **Buttons:** Primary buttons use the Secondary (Lime) color with a pill shape, 2px black border, and a 4px black hard shadow. On hover, the shadow disappears (translating the button 4px down/right) to simulate a physical click.
- **Cards:** Sharp corners, 2px black border, glassmorphic background blur. Add a subtle "noise" or "grain" texture to the card background to enhance the digital-native feel.
- **Input Fields:** Sharp corners, black background, 2px white border that turns Lime Green on focus. Use JetBrains Mono for placeholder text.
- **Chips:** Small, pill-shaped elements with a primary violet stroke and no fill.
- **Gradients:** Use "Grainy Gradients" for backgrounds—mesh gradients combining Electric Violet, Soft Lavender, and Deep Black with a high-intensity noise overlay (15% opacity).
- **Lists:** Separated by heavy 2px black horizontal rules. Hover states should trigger a full-row fill of Electric Violet with the text color switching to absolute black.