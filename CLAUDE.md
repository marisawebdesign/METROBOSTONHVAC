# Metro Boston HVAC Website

## Project Overview
HVAC services website for Metro Boston HVAC (Stoughton, MA). Static HTML/CSS/JS site, no build tools or framework.

## File Structure
```
/
  index.html          - Homepage (~900 lines HTML only)
  styles.css          - All homepage CSS (~2250 lines, extracted from index.html)
  scripts.js          - All homepage JS (~250 lines: map, scroll reveal, carousel)
  services.html       - Services page
  quote.html          - Instant quote page
  contact.html        - Contact page
  offers.html         - Offers/promotions page
  chat-widget.css     - Chat widget styles
  chat-widget.js      - Chat widget logic
  chat-data.json      - Chat widget data
  technician-widget.css - Technician availability widget styles
  technician-widget.js  - Technician availability widget logic
  images/
    logo.jpg          - Company logo (used in header across all pages)
    van.jpg           - Service van photo (homepage local section)
    btucalculator.jpg - BTU calculator tool card image
    quiz.jpg          - System selector quiz tool card image
  tools/
    btu-calculator.html - BTU calculator tool page
```

## index.html Section Map (line numbers approximate)
- **Lines 1-14**: `<head>` - meta, fonts, stylesheet links
- **Lines 15-113**: Header top bar (logo, phone, trust badges, CTA button, mobile toggle)
- **Lines 115-188**: Navigation bar (desktop nav with dropdowns)
- **Lines 190-303**: Mobile menu (full-screen overlay)
- **Lines 305-393**: Hero section (headline, CTA, contact options, Google badge)
- **Lines 395-542**: Local service section (about text, features, service area map + city lists)
- **Lines 544-635**: Payment & financing section (pricing info, trust badges, price shield)
- **Lines 637-713**: Tools & printouts section (carousel with 3 slides)
- **Lines 715-841**: Reviews section (6 review platform cards)
- **Lines 843-894**: Instant quote CTA section
- **Lines 895-901**: Script tags (leaflet, scripts.js, widgets), body/html close

## styles.css Section Map (line numbers approximate)
- **Lines 1-30**: CSS variables (:root) and body base styles
- **Lines 31-250**: Header top bar styles
- **Lines 251-370**: Navigation bar and dropdown styles
- **Lines 370-530**: Mobile menu styles
- **Lines 530-790**: Hero section styles (headlines, CTAs, badges)
- **Lines 790-1165**: Local section + service area map + city list styles
- **Lines 1165-1350**: Tools carousel styles
- **Lines 1350-1450**: Reviews section styles
- **Lines 1450-1570**: Quote section styles
- **Lines 1570-1800**: Payment section styles
- **Lines 1810-2200**: Responsive breakpoints (1200px, 1024px, 768px, 480px)
- **Lines 2200-2250**: Scroll animation keyframes

## scripts.js Contents
1. **Leaflet map initialization** (lines 1-185): Service area map with city markers, polygons, hover/click interactions
2. **Scroll reveal animations** (lines 187-208): IntersectionObserver-based fade-in animations
3. **Tools carousel** (lines 210-252): Arrow navigation, dots, touch/swipe support

## Key Details
- **Phone**: (781) 408-2506
- **License**: #081600137
- **Colors**: Navy (#1a3a52), Orange (#ff6b35), Gold (#ffd700)
- **Fonts**: Bebas Neue (headings), Source Sans 3 (body)
- **External deps**: Leaflet.js (maps), Google Fonts
- **Image paths**: All local images in `images/` folder. Other pages reference as `images/filename.jpg`, tools/ subdir uses `../images/filename.jpg`
