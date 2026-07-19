---
name: CraveFlow
colors:
  surface: '#fff8f6'
  surface-dim: '#eed5cb'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1ec'
  surface-container: '#ffe9e2'
  surface-container-high: '#fde3d9'
  surface-container-highest: '#f7ddd3'
  on-surface: '#261813'
  on-surface-variant: '#594137'
  inverse-surface: '#3c2d27'
  inverse-on-surface: '#ffede7'
  outline: '#8d7165'
  outline-variant: '#e1bfb2'
  surface-tint: '#a33e00'
  primary: '#9f3d00'
  on-primary: '#ffffff'
  primary-container: '#c74e00'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb596'
  secondary: '#3f6653'
  on-secondary: '#ffffff'
  secondary-container: '#beead1'
  on-secondary-container: '#436b58'
  tertiary: '#145ea1'
  on-tertiary: '#ffffff'
  tertiary-container: '#3977bb'
  on-tertiary-container: '#fdfcff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcd'
  primary-fixed-dim: '#ffb596'
  on-primary-fixed: '#360f00'
  on-primary-fixed-variant: '#7c2e00'
  secondary-fixed: '#c1ecd4'
  secondary-fixed-dim: '#a5d0b9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#274e3d'
  tertiary-fixed: '#d3e4ff'
  tertiary-fixed-dim: '#a2c9ff'
  on-tertiary-fixed: '#001c38'
  on-tertiary-fixed-variant: '#004881'
  background: '#fff8f6'
  on-background: '#261813'
  surface-variant: '#f7ddd3'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-margin-mobile: 16px
  container-margin-desktop: 32px
  gutter: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style

The design system is engineered to bridge the gap between high-frequency utility and culinary delight. Targeting urban diners and fast-paced cafe environments, the visual language evokes an immediate sense of efficiency and appetite.

The style is **Corporate Modern with a Tactile Edge**. It prioritizes extreme clarity for the mobile ordering experience while maintaining a robust, data-dense architecture for the administrative dashboards. The aesthetic is characterized by generous whitespace, high-contrast interactive elements, and a sophisticated use of depth to guide the user's eye toward primary conversion points like "Place Order."

## Colors

The palette leverages color psychology to drive user behavior. 

- **Primary (Terracotta Orange):** Used for primary actions, price points, and active states to stimulate appetite and urgency.
- **Secondary (Deep Forest):** Provides a grounded, premium feel. Used for headers, navigation sidebars in dashboards, and typography to instill trust.
- **Accent (Currency Blue):** Reserved specifically for payment integration touchpoints (PhonePe/UPI) to signify a secure financial transaction.
- **Success (Emerald):** Dedicated to order confirmations, "Veg" indicators, and completed status tags.
- **Neutral/Surface:** A range of ultra-light grays (#F8F9FA to #E9ECEF) ensures the UI feels spacious and "high-end" rather than cluttered.

## Typography

This design system utilizes **Plus Jakarta Sans** for its modern, slightly rounded apertures that maintain a friendly yet professional tone.

- **Headlines:** Use Bold (700) or ExtraBold (800) weights for menu item names and section headers to ensure high scannability in busy environments.
- **Numeric Data:** Use Medium (500) weights for prices to ensure they are prominent but not distracting from the item name.
- **Dashboards:** For the Cafe Owner and Super Admin views, font sizes scale down to `body-md` and `label-md` to accommodate dense tables and metric grids without losing legibility.

## Layout & Spacing

The system uses an **8px linear scale** for consistent rhythm.

- **Mobile (Customer):** A single-column fluid layout. Touch targets for menu categories and "Add to Cart" buttons must be a minimum of 48px in height. Margins are fixed at 16px to maximize content real estate.
- **Desktop (Admin):** A 12-column fixed grid with a 240px persistent left navigation sidebar. 
- **Dashboard Cards:** Use a 24px internal padding (`stack-lg`) to maintain a "high-end" airy feel even when the data density is high. 
- **Grids:** Cafe lists and analytics charts utilize a 16px gutter to maintain clear separation between distinct data modules.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Soft Ambient Shadows** to define hierarchy:

1.  **Level 0 (Surface):** The main background uses the Surface Gray (#F8F9FA) to reduce eye strain.
2.  **Level 1 (Cards):** Menu items and dashboard widgets sit on pure white (#FFFFFF) backgrounds with a very soft, 4% opacity black shadow (Y: 2px, Blur: 8px).
3.  **Level 2 (Interactive):** Hover states on desktop and active selections on mobile use a 8% opacity shadow with a slight color tint of the Primary color to make elements feel "lifted."
4.  **Level 3 (Modals/Overlays):** Checkout drawers and payment confirmations use a heavy 16% opacity shadow and a 4px backdrop blur to focus the user on the transaction.

## Shapes

The shape language is **distinctly rounded (12px - 16px)** to feel approachable and modern.

- **Buttons & Inputs:** Use a consistent 12px radius. 
- **Product Cards:** Use a 16px radius to create a soft, "contained" look for food photography.
- **Status Tags:** Use fully pill-shaped (rounded-xl) geometry to distinguish them from interactive buttons.
- **Selection Indicators:** Vegetarian (Green Circle) and Non-Veg (Brown Triangle/Square) icons should be enclosed in a 4px rounded container for standardized iconography.

## Components

### Buttons
- **Primary:** Terracotta background, White text. High-shadow on hover.
- **Secondary:** Deep Forest outline or ghost style for "Cancel" or "View Details."
- **Floating Action Button (Mobile):** A prominent "View Cart" FAB fixed to the bottom, using the Primary color.

### Menu Items (Customer)
- **Card Layout:** Image on the left (or top), title in `headline-md`, price in `primary-color`. 
- **Stepper:** A +/- quantity selector that appears only after the initial "Add" button is tapped.

### Dashboard Modules (Admin)
- **Status Tags:** `Success` (Live), `Warning` (Pending), and `Neutral` (Draft) using subtle background tints with bold 12px label text.
- **Data Tables:** High-contrast borders (1px, #E9ECEF) with zebra-striping for readability.
- **Metric Cards:** Large `display-lg` numbers for key stats (Total Revenue, Active Orders).

### Inputs
- **Search:** Rounded 12px with a subtle inner shadow and a leading "search" icon.
- **Form Fields:** Focus state highlights the border in Primary Orange with a 2px outer glow.