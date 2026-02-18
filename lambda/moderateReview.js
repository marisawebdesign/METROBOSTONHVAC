const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'MetroBostonHVACReviews';
const API_KEY = process.env.MODERATION_API_KEY;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    // Validate API key
    const providedKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];
    if (!providedKey || providedKey !== API_KEY) {
        return {
            statusCode: 403,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Forbidden: invalid API key' })
        };
    }

    try {
        // GET: fetch pending reviews for moderation dashboard
        if (event.httpMethod === 'GET') {
            const statusFilter = (event.queryStringParameters && event.queryStringParameters.status) || 'pending';

            const result = await docClient.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: '#status = :status',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':status': statusFilter
                }
            }));

            const reviews = (result.Items || [])
                .sort(function(a, b) {
                    return new Date(b.timestamp) - new Date(a.timestamp);
                })
                .map(function(item) {
                    return {
                        reviewId: item.reviewId,
                        reviewerName: item.reviewerName,
                        timestamp: item.timestamp,
                        town: item.town,
                        stars: item.stars,
                        serviceType: item.serviceType,
                        reviewText: item.reviewText,
                        status: item.status
                    };
                });

            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({ reviews: reviews, count: reviews.length })
            };
        }

        // POST: approve or reject a review
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            const { reviewId, action } = body;

            if (!reviewId || !action) {
                return {
                    statusCode: 400,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: 'reviewId and action are required' })
                };
            }

            if (action !== 'approve' && action !== 'reject') {
                return {
                    statusCode: 400,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: 'Action must be "approve" or "reject"' })
                };
            }

            const newStatus = action === 'approve' ? 'approved' : 'rejected';

            // Find the review by scanning for the reviewId
            const scanResult = await docClient.send(new ScanCommand({
                TableName: TABLE_NAME,
                FilterExpression: 'reviewId = :rid',
                ExpressionAttributeValues: {
                    ':rid': reviewId
                }
            }));

            if (!scanResult.Items || scanResult.Items.length === 0) {
                return {
                    statusCode: 404,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: 'Review not found' })
                };
            }

            const review = scanResult.Items[0];

            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    reviewerName: review.reviewerName,
                    timestamp: review.timestamp
                },
                UpdateExpression: 'SET #status = :newStatus, moderatedAt = :now',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues: {
                    ':newStatus': newStatus,
                    ':now': new Date().toISOString()
                }
            }));

            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({ message: `Review ${newStatus} successfully`, reviewId: reviewId })
            };
        }

        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (err) {
        console.error('Error in moderation:', err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
