# AWS S3 Static Website Hosting — Deployment Notes

## S3 Bucket Configuration

### 1. Create S3 Bucket
```bash
aws s3 mb s3://metrobostonhvac-website --region us-east-1
```

### 2. Enable Static Website Hosting
```bash
aws s3 website s3://metrobostonhvac-website \
  --index-document index.html \
  --error-document index.html
```

### 3. Bucket Policy (Public Read Access)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::metrobostonhvac-website/*"
    }
  ]
}
```

Apply with:
```bash
aws s3api put-bucket-policy --bucket metrobostonhvac-website --policy file://bucket-policy.json
```

## Deployment Script

Save as `deploy.sh` and run from the project root:

```bash
#!/bin/bash
set -e

BUCKET="s3://metrobostonhvac-website"
DIST_DIR="."

echo "=== Deploying Metro Boston HVAC to S3 ==="

# 1. HTML files — no-cache (always revalidate)
echo "Uploading HTML files..."
aws s3 sync "$DIST_DIR" "$BUCKET" \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache" \
  --content-type "text/html; charset=utf-8" \
  --delete

# 2. Minified CSS — 1 year cache (versioned via ?v= query strings)
echo "Uploading minified CSS..."
aws s3 sync "$DIST_DIR" "$BUCKET" \
  --exclude "*" \
  --include "*.min.css" \
  --cache-control "public, max-age=31536000" \
  --content-type "text/css; charset=utf-8"

# 3. Minified JS — 1 year cache (versioned via ?v= query strings)
echo "Uploading minified JS..."
aws s3 sync "$DIST_DIR" "$BUCKET" \
  --exclude "*" \
  --include "*.min.js" \
  --cache-control "public, max-age=31536000" \
  --content-type "application/javascript; charset=utf-8"

# 4. WebP images — 30 day cache
echo "Uploading WebP images..."
aws s3 sync "$DIST_DIR/images" "$BUCKET/images" \
  --exclude "*" \
  --include "*.webp" \
  --cache-control "public, max-age=2592000" \
  --content-type "image/webp"

# 5. JPEG/JPG images — 30 day cache
echo "Uploading JPEG images..."
aws s3 sync "$DIST_DIR/images" "$BUCKET/images" \
  --exclude "*" \
  --include "*.jpg" --include "*.jpeg" \
  --cache-control "public, max-age=2592000" \
  --content-type "image/jpeg"

# 6. PNG images — 30 day cache
echo "Uploading PNG images..."
aws s3 sync "$DIST_DIR/images" "$BUCKET/images" \
  --exclude "*" \
  --include "*.png" \
  --cache-control "public, max-age=2592000" \
  --content-type "image/png"

# 7. Font files — 1 year cache
echo "Uploading fonts..."
aws s3 sync "$DIST_DIR/fonts" "$BUCKET/fonts" \
  --exclude "*" \
  --include "*.woff2" \
  --cache-control "public, max-age=31536000" \
  --content-type "font/woff2"

aws s3 sync "$DIST_DIR/fonts" "$BUCKET/fonts" \
  --exclude "*" \
  --include "*.woff" \
  --cache-control "public, max-age=31536000" \
  --content-type "font/woff"

# 8. JSON data — 1 hour cache
echo "Uploading JSON data..."
aws s3 sync "$DIST_DIR" "$BUCKET" \
  --exclude "*" \
  --include "*.json" \
  --cache-control "public, max-age=3600" \
  --content-type "application/json; charset=utf-8"

# 9. PDF files — 30 day cache
echo "Uploading PDFs..."
aws s3 sync "$DIST_DIR/printouts" "$BUCKET/printouts" \
  --exclude "*" \
  --include "*.pdf" \
  --cache-control "public, max-age=2592000" \
  --content-type "application/pdf"

# 10. Root-level images (gabe.jpg, hvacemergency.jpg, print.jpeg, printout.jpeg)
echo "Uploading root-level images..."
for img in gabe.jpg hvacemergency.jpg print.jpeg printout.jpeg; do
  if [ -f "$DIST_DIR/$img" ]; then
    aws s3 cp "$DIST_DIR/$img" "$BUCKET/$img" \
      --cache-control "public, max-age=2592000" \
      --content-type "image/jpeg"
  fi
done

echo "=== Deployment complete ==="
echo "Website URL: http://metrobostonhvac-website.s3-website-us-east-1.amazonaws.com"
```

## Pre-Compression with Gzip (Optional)

S3 static website hosting does **not** auto-compress responses. If not using CloudFront, you can pre-compress files and upload with `Content-Encoding: gzip` metadata:

```bash
# Pre-compress CSS
gzip -9 -k styles.min.css
aws s3 cp styles.min.css.gz s3://metrobostonhvac-website/styles.min.css \
  --content-encoding gzip \
  --content-type "text/css; charset=utf-8" \
  --cache-control "public, max-age=31536000"

# Pre-compress JS
gzip -9 -k scripts.min.js
aws s3 cp scripts.min.js.gz s3://metrobostonhvac-website/scripts.min.js \
  --content-encoding gzip \
  --content-type "application/javascript; charset=utf-8" \
  --cache-control "public, max-age=31536000"
```

**Note:** This approach only works if ALL clients accept gzip. If using CloudFront in front of S3, CloudFront handles compression automatically — you do NOT need to pre-compress.

## CloudFront (Recommended)

For production, place a CloudFront distribution in front of the S3 bucket:

1. **Automatic compression** — CloudFront auto-compresses HTML/CSS/JS with gzip/brotli
2. **Global CDN** — Content served from edge locations near users
3. **HTTPS** — Free SSL via ACM (AWS Certificate Manager)
4. **Custom domain** — Point your domain's DNS to CloudFront

```bash
aws cloudfront create-distribution \
  --origin-domain-name metrobostonhvac-website.s3-website-us-east-1.amazonaws.com \
  --default-root-object index.html \
  --comment "Metro Boston HVAC Website"
```

## Files NOT to Upload

Exclude these from deployment:
- `*.src.css`, `*.src.js` — unminified source files (for development only)
- `.git/`, `.gitignore`
- `CLAUDE.md`, `README.md`, `setup-instructions.md`
- `cache-policy-notes.md`, `deploy-notes.md`
- `lambda/` — AWS Lambda functions (deployed separately)
- `node_modules/` (if any)

## External Resources Still Third-Party

These resources are loaded from external servers and cannot be cached by us:

| Resource | Domain | Used On |
|----------|--------|---------|
| Unsplash hero image | images.unsplash.com | Homepage hero |
| iStockPhoto image | media.istockphoto.com | Homepage payment section |
| CARTO map tiles | basemaps.cartocdn.com | Homepage service area map |
| OpenStreetMap tiles | tile.openstreetmap.org | Technician widget map |
