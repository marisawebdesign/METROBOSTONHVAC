const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'MetroBostonHVACReviews';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const body = JSON.parse(event.body);
        const { name, town, stars, serviceType, reviewText } = body;

        // Validate required fields
        if (!name || !town || !stars || !serviceType || !reviewText) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'All fields are required: name, town, stars, serviceType, reviewText' })
            };
        }

        // Validate stars range
        const starsNum = parseInt(stars);
        if (isNaN(starsNum) || starsNum < 1 || starsNum > 5) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Stars must be between 1 and 5' })
            };
        }

        // Validate review text length
        const trimmedText = reviewText.trim();
        if (trimmedText.length < 10 || trimmedText.length > 1000) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Review text must be between 10 and 1000 characters' })
            };
        }

        // Rate limit: check if same name submitted within 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentReviews = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: '#name = :name AND #ts > :since',
            ExpressionAttributeNames: {
                '#name': 'reviewerName',
                '#ts': 'timestamp'
            },
            ExpressionAttributeValues: {
                ':name': name.trim(),
                ':since': oneDayAgo
            }
        }));

        if (recentReviews.Items && recentReviews.Items.length > 0) {
            return {
                statusCode: 429,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'You have already submitted a review in the last 24 hours. Please try again later.' })
            };
        }

        // Create review item
        const timestamp = new Date().toISOString();
        const reviewItem = {
            reviewerName: name.trim(),
            timestamp: timestamp,
            town: town.trim(),
            stars: starsNum,
            serviceType: serviceType.trim(),
            reviewText: trimmedText,
            status: 'pending',
            reviewId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: reviewItem
        }));

        return {
            statusCode: 201,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Review submitted successfully. It will appear after approval.', reviewId: reviewItem.reviewId })
        };

    } catch (err) {
        console.error('Error submitting review:', err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
