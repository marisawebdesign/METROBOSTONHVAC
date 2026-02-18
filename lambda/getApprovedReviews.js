const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'MetroBostonHVACReviews';
const STATUS_INDEX = 'status-timestamp-index';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
};

exports.handler = async (event) => {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        const result = await docClient.send(new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: STATUS_INDEX,
            KeyConditionExpression: '#status = :approved',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':approved': 'approved'
            },
            ScanIndexForward: false // newest first
        }));

        const reviews = (result.Items || []).map(function(item) {
            return {
                reviewId: item.reviewId,
                name: item.reviewerName,
                town: item.town,
                stars: item.stars,
                serviceType: item.serviceType,
                reviewText: item.reviewText,
                date: item.timestamp
            };
        });

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ reviews: reviews, count: reviews.length })
        };

    } catch (err) {
        console.error('Error fetching approved reviews:', err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
