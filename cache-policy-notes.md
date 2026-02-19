# Cache Policy Notes for AWS S3 Static Hosting

## Overview

This document defines the recommended `Cache-Control` headers to set per file type when deploying to AWS S3 static website hosting. Headers are set per-object via S3 metadata during upload.

## Cache-Control Settings by File Type

### HTML Files
```
Cache-Control: no-cache
```
- Always revalidate with the server
- Ensures users always get the latest HTML content
- Applies to: `*.html`

### CSS and JavaScript Files (versioned)
```
Cache-Control: public, max-age=31536000
```
- 1 year cache (immutable content, versioned via `?v=X.X` query strings)
- When updating CSS/JS, increment the version query string in HTML references
- Applies to: `*.css`, `*.js` (e.g., `styles.css?v=1.0`, `scripts.js?v=1.0`)

### Images (WebP, JPG, PNG)
```
Cache-Control: public, max-age=2592000
```
- 30 day cache
- Images change less frequently but aren't versioned
- Applies to: `*.webp`, `*.jpg`, `*.jpeg`, `*.png`, `*.svg`

### Font Files
```
Cache-Control: public, max-age=31536000
```
- 1 year cache (fonts never change)
- Applies to: `*.woff2`, `*.woff`, `*.ttf`, `*.eot`

### JSON Data Files
```
Cache-Control: public, max-age=3600
```
- 1 hour cache
- Applies to: `*.json` (e.g., `chat-data.json`)

### PDF Files
```
Cache-Control: public, max-age=2592000
```
- 30 day cache
- Applies to: `*.pdf`

## External Resources (Third-Party)

The following resources remain external and their cache headers are controlled by the third party:

| Resource | Domain | Notes |
|----------|--------|-------|
| Unsplash hero image | images.unsplash.com | Used on homepage hero; cached by Unsplash CDN |
| iStockPhoto image | media.istockphoto.com | Used on homepage payment section |
| CARTO map tiles | basemaps.cartocdn.com | Leaflet map tile server for service area map |
| OpenStreetMap tiles | tile.openstreetmap.org | Used by technician widget map |

All other resources (fonts, Leaflet library, CSS, JS) are now self-hosted for full cache control.

## Version Query String Convention

Static assets use query strings for cache busting:
- `styles.css?v=1.0` — increment to `?v=1.1` when CSS changes
- `scripts.js?v=1.0` — increment when JS changes
- `chat-widget.css?v=1.0` / `chat-widget.js?v=1.0` — increment when widget changes
- `leaflet.css?v=1.9.4` / `leaflet.js?v=1.9.4` — matches Leaflet library version

This allows setting aggressive 1-year cache TTLs since the version change forces browsers to fetch the new file.
