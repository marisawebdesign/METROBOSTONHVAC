# Metro Boston HVAC Reviews System — AWS Setup Instructions

## Overview

This guide walks through setting up the serverless backend for the reviews system:
- **DynamoDB** table for storing reviews
- **3 Lambda functions** for submit, fetch, and moderate
- **API Gateway** for HTTP endpoints
- **CORS** configuration for GitHub Pages / S3 hosting

---

## 1. DynamoDB Table Setup

### Create the table

1. Go to **DynamoDB → Tables → Create table**
2. Table name: `MetroBostonHVACReviews`
3. Partition key: `reviewerName` (String)
4. Sort key: `timestamp` (String)
5. Leave defaults (On-demand capacity recommended for low traffic)
6. Click **Create table**

### Create Global Secondary Index (GSI)

1. Go to the table → **Indexes** tab → **Create index**
2. Partition key: `status` (String)
3. Sort key: `timestamp` (String)
4. Index name: `status-timestamp-index`
5. Projected attributes: **All**
6. Click **Create index**

---

## 2. Lambda Functions

### Create IAM Role

1. Go to **IAM → Roles → Create role**
2. Trusted entity: **Lambda**
3. Attach policies:
   - `AWSLambdaBasicExecutionRole`
   - Create an inline policy for DynamoDB access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/MetroBostonHVACReviews",
        "arn:aws:dynamodb:us-east-1:YOUR_ACCOUNT_ID:table/MetroBostonHVACReviews/index/*"
      ]
    }
  ]
}
```

4. Role name: `MetroBostonHVACReviewsLambdaRole`

### Function 1: submitReview

1. Go to **Lambda → Create function**
2. Function name: `metrobostonhvac-submitReview`
3. Runtime: **Node.js 20.x**
4. Execution role: `MetroBostonHVACReviewsLambdaRole`
5. Upload code from `lambda/submitReview.js`
6. Handler: `submitReview.handler`
7. Timeout: 10 seconds

### Function 2: getApprovedReviews

1. Function name: `metrobostonhvac-getApprovedReviews`
2. Runtime: **Node.js 20.x**
3. Execution role: same role
4. Upload code from `lambda/getApprovedReviews.js`
5. Handler: `getApprovedReviews.handler`
6. Timeout: 10 seconds

### Function 3: moderateReview

1. Function name: `metrobostonhvac-moderateReview`
2. Runtime: **Node.js 20.x**
3. Execution role: same role
4. Upload code from `lambda/moderateReview.js`
5. Handler: `moderateReview.handler`
6. Timeout: 10 seconds
7. **Environment variables:**
   - `MODERATION_API_KEY`: Generate a random key (e.g., `openssl rand -hex 32`)

---

## 3. API Gateway Setup

### Create the API

1. Go to **API Gateway → Create API → HTTP API**
2. API name: `MetroBostonHVACReviews`
3. Create the following routes:

| Method | Route               | Lambda Integration           | Auth        |
|--------|---------------------|------------------------------|-------------|
| POST   | /reviews            | metrobostonhvac-submitReview | None (public) |
| GET    | /reviews            | metrobostonhvac-getApprovedReviews | None (public) |
| POST   | /reviews/moderate   | metrobostonhvac-moderateReview | API key header |
| GET    | /reviews/moderate   | metrobostonhvac-moderateReview | API key header |

### Configure CORS

1. Go to **API → CORS**
2. Set the following:
   - **Allowed origins**: `https://yourdomain.com`, `https://your-bucket.s3.amazonaws.com`, `http://localhost:*` (for testing)
   - **Allowed methods**: `GET, POST, OPTIONS`
   - **Allowed headers**: `Content-Type, x-api-key`
   - **Max age**: `86400`

### Deploy

1. Create a stage: `prod`
2. Deploy the API
3. Note the invoke URL: `https://XXXXXXXX.execute-api.us-east-1.amazonaws.com/prod`

### Update Frontend

Replace `YOUR-API-ENDPOINT` in `reviews.html` and `admin.html` with your actual API Gateway endpoint ID.

---

## 4. CORS Configuration for GitHub Pages + S3

If hosting on GitHub Pages:
- Allowed origin: `https://yourusername.github.io`

If hosting on S3:
- Allowed origin: `https://your-bucket.s3-website-us-east-1.amazonaws.com`

If using a custom domain:
- Allowed origin: `https://www.metrobostonhvac.com`

API Gateway HTTP APIs handle CORS at the gateway level. The Lambda functions also include CORS headers as a fallback.

---

## 5. Test Commands

### Test submit review (POST /reviews)

```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "town": "Stoughton",
    "stars": 5,
    "serviceType": "Emergency Repair",
    "reviewText": "This is a test review submission to verify the endpoint works."
  }'
```

Expected response:
```json
{"message": "Review submitted successfully. It will appear after approval.", "reviewId": "..."}
```

### Test fetch approved reviews (GET /reviews)

```bash
curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/reviews
```

Expected response:
```json
{"reviews": [], "count": 0}
```

### Test fetch pending reviews for moderation (GET /reviews/moderate)

```bash
curl https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/reviews/moderate \
  -H "x-api-key: YOUR_MODERATION_API_KEY"
```

Expected response:
```json
{"reviews": [{"reviewId": "...", "reviewerName": "Test User", ...}], "count": 1}
```

### Test approve a review (POST /reviews/moderate)

```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/reviews/moderate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_MODERATION_API_KEY" \
  -d '{
    "reviewId": "REVIEW_ID_FROM_ABOVE",
    "action": "approve"
  }'
```

Expected response:
```json
{"message": "Review approved successfully", "reviewId": "..."}
```

### Test reject a review (POST /reviews/moderate)

```bash
curl -X POST https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com/prod/reviews/moderate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_MODERATION_API_KEY" \
  -d '{
    "reviewId": "REVIEW_ID_FROM_ABOVE",
    "action": "reject"
  }'
```

---

## 6. Monthly Cost Estimate

Based on low-traffic HVAC website (estimated ~500 page views/month, ~10 reviews/month):

| Service         | Usage Estimate               | Monthly Cost |
|-----------------|------------------------------|-------------|
| DynamoDB        | On-demand, <100 reads/writes | ~$0.00 (free tier) |
| Lambda          | <1,000 invocations/month     | ~$0.00 (free tier covers 1M requests) |
| API Gateway     | <1,000 requests/month        | ~$0.00 (free tier covers 1M requests for 12 months) |
| CloudWatch Logs | Minimal logging              | ~$0.00 |
| **Total**       |                              | **~$0.00 - $0.50/month** |

After the 12-month free tier expires:
- DynamoDB on-demand: ~$0.25/month for this volume
- Lambda: still free at this volume (1M free requests/month is permanent)
- API Gateway: ~$1.00/month after free tier
- **Estimated post-free-tier: ~$1.00 - $2.00/month**

---

## Troubleshooting

- **CORS errors**: Verify the allowed origins in API Gateway match your hosting domain exactly (including `https://`). Check that OPTIONS requests are handled.
- **403 on moderate endpoint**: Verify the `x-api-key` header matches the `MODERATION_API_KEY` environment variable in the Lambda function.
- **Reviews not appearing**: Check that the review status was changed to "approved" in DynamoDB. Verify the GSI `status-timestamp-index` exists and is active.
- **Rate limit hit**: The submit function blocks duplicate names within 24 hours. Wait or use a different name for testing.
