---
name: Slate & Glass
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#b9c8de'
  on-secondary: '#233143'
  secondary-container: '#39485a'
  on-secondary-container: '#a7b6cc'
  tertiary: '#c5cce6'
  on-tertiary: '#283044'
  tertiary-container: '#a9b1ca'
  on-tertiary-container: '#3c4459'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  section-gap: 160px
  element-gap: 32px
  container-max: 1280px
  margin-mobile: 24px
  gutter: 32px
---

## Brand & Style

The design system is built for a forward-thinking, high-performance SaaS landing page. It evokes a sense of technical precision, calm authority, and "cool" sophistication. The target audience includes tech-native entrepreneurs and digital-first businesses who value efficiency and modern aesthetics.

The visual style is a hybrid of **Minimalism** and **Glassmorphism**, characterized by:
- **Refined SaaS Aesthetic:** Heavy use of whitespace and a "less is more" approach to functional elements.
- **Atmospheric Depth:** Subtle grain textures and frosted glass surfaces that soften the clinical feel of traditional SaaS layouts.
- **High-Contrast Precision:** Razor-sharp typography and a palette that transitions from deep slate to brilliant white, ensuring every element feels intentional and high-end.

## Colors

The palette is anchored in a sophisticated dark mode, utilizing "Slate Blues" to create a more expansive and premium feel than pure black.

- **Primary:** A vibrant sky blue (Sky 400) used sparingly for high-impact calls to action and critical highlights.
- **Secondary:** A muted slate (Slate 400) for supporting text and secondary interface elements.
- **Background/Tertiary:** A deep, dark navy-slate (Slate 950) that serves as the canvas, providing the foundation for glass effects.
- **Neutral:** A crisp, off-white (Slate 50) for primary headlines and body text to maximize readability against the dark background.
- **Accents:** Use glass-like overlays with 10-15% white opacity and a 20px backdrop blur to create "cool" floating containers.

## Typography

Typography is used as a core design element, relying on extreme scale and weight contrast to create hierarchy.

- **Headlines:** Use **Hanken Grotesk** with tight letter spacing for a sharp, modern editorial feel. Large hero text should use the "ExtraBold" weight.
- **Body:** **Inter** provides high legibility and a systematic, clean look for long-form content and descriptions.
- **Labels & Tech Info:** **Geist** is used for "technical" details, tags, and small labels to lean into the developer-centric, "cool" aesthetic.

## Layout & Spacing

The layout follows a **Fixed Grid** approach for the main content container, while allowing background elements (like glass gradients) to bleed to the edges.

- **Rhythm:** A 12-column grid is used for desktop. Section gaps are intentionally large (160px) to allow the "sophisticated whitespace" to breathe.
- **Fluidity:** On tablet and mobile, the 12-column grid collapses to 8 and 4 columns respectively. Padding increases on mobile to ensure content doesn't feel cramped.
- **Micro-spacing:** Use a base 8px scale. Element groupings (e.g., headline to sub-headline) should use 16px or 24px, while larger blocks use 32px or 48px.

## Elevation & Depth

This design system avoids traditional drop shadows in favor of **Tonal Layers** and **Glassmorphism**:

- **Z-Axis Hierarchy:** Background (Slate 950) -> Content Cards (Slate 900 or 10% Glass) -> Floating Modals (20% Glass with 40px blur).
- **Glass Effects:** Apply a subtle grain overlay (5% opacity) to glass containers to give them a tactile, Gen-Z feel.
- **Borders:** Instead of shadows, use thin, 1px "inner glow" borders on glass elements (#FFFFFF with 10% opacity) to define edges against dark backgrounds.

## Shapes

The shape language is controlled and modern.
- **Base Corner Radius:** 0.5rem (8px) for inputs and smaller UI components.
- **Container Radius:** 1rem (16px) for cards and sections to create a softer, more approachable feel.
- **Hero Elements:** Large image containers or glass panels should utilize 1.5rem (24px) to emphasize the "object-like" quality of the UI.

## Components

### Buttons
- **Primary:** Solid Primary Sky Blue with dark Slate 950 text. No border. High contrast is key.
- **Secondary:** Glass-style background (10% white) with a 1px white border (15% opacity).
- **Hover States:** Subtle scale increase (1.02x) and a brightening of the background or border.

### Cards
- Use a glassmorphic background with `backdrop-filter: blur(20px)`.
- Include a 1px top-left aligned white border to simulate light hitting the edge.
- Padding should be generous (min 40px) to maintain the premium feel.

### Input Fields
- Dark slate backgrounds (#1E293B) with a subtle 1px border.
- Active state should trigger a primary blue glow (low-opacity outer shadow).

### Chips/Tags
- Small, uppercase Geist font. Use a "pill" shape (rounded-full) with a semi-transparent slate background to distinguish them from interactive buttons.

### Subtle Grain
- A global noise texture should be applied at a very low opacity (around 2-3%) over the entire background to provide a sophisticated, film-like finish.