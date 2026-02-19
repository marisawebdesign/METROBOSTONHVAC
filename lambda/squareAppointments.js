/**
 * Square Appointments Lambda Proxy
 *
 * Proxies frontend requests to the Square Appointments API,
 * keeping the access token server-side.
 *
 * Environment variables (set in Lambda configuration):
 *   SQUARE_ACCESS_TOKEN  - Square API access token
 *   SQUARE_ENVIRONMENT   - 'sandbox' or 'production'
 *
 * API Gateway routes (all through single Lambda with ?action= param):
 *   GET  ?action=services                              - List bookable services
 *   GET  ?action=availability&serviceVariationId=X      - Search available slots
 *        &startDate=ISO&endDate=ISO&locationId=L
 *   POST ?action=book                                  - Create a booking
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
};

function getBaseUrl() {
    return process.env.SQUARE_ENVIRONMENT === 'production'
        ? 'https://connect.squareup.com/v2'
        : 'https://connect.squareupsandbox.com/v2';
}

async function squareRequest(method, path, body) {
    const url = `${getBaseUrl()}${path}`;
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': '2024-10-17'
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
        const err = new Error('Square API error');
        err.status = response.status;
        err.details = data.errors || data;
        throw err;
    }
    return data;
}

function respond(statusCode, body) {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify(body)
    };
}

// ── GET ?action=services ─────────────────────────────────────────────
async function getServices() {
    // Fetch first active location
    const locData = await squareRequest('GET', '/locations');
    const locations = (locData.locations || []).filter(function(l) {
        return l.status === 'ACTIVE';
    });
    if (locations.length === 0) {
        return respond(200, { services: [], locationId: null });
    }
    const locationId = locations[0].id;

    // Fetch catalog items (services)
    const catalogData = await squareRequest('GET', '/catalog/list?types=ITEM');
    const items = catalogData.objects || [];

    var services = [];
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var variation = (item.item_data && item.item_data.variations && item.item_data.variations[0]) || {};
        var varData = variation.item_variation_data || {};
        services.push({
            id: item.id,
            name: (item.item_data && item.item_data.name) || 'Service',
            description: (item.item_data && item.item_data.description) || '',
            variationId: variation.id || null,
            variationVersion: variation.version ? parseInt(variation.version) : null,
            durationMinutes: varData.service_duration
                ? Math.round(varData.service_duration / 60000)
                : 60,
            priceMoney: varData.price_money || null
        });
    }

    return respond(200, { services: services, locationId: locationId });
}

// ── GET ?action=availability ─────────────────────────────────────────
async function getAvailability(params) {
    var serviceVariationId = params.serviceVariationId;
    var startDate = params.startDate;
    var endDate = params.endDate;
    var locationId = params.locationId;

    if (!serviceVariationId || !startDate || !endDate || !locationId) {
        return respond(400, {
            error: 'Missing required parameters: serviceVariationId, startDate, endDate, locationId'
        });
    }

    var searchData = await squareRequest('POST', '/bookings/availability/search', {
        query: {
            filter: {
                start_at_range: {
                    start_at: startDate,
                    end_at: endDate
                },
                location_id: locationId,
                segment_filters: [{
                    service_variation_id: serviceVariationId
                }]
            }
        }
    });

    return respond(200, { availabilities: searchData.availabilities || [] });
}

// ── POST ?action=book ────────────────────────────────────────────────
async function createBooking(body) {
    var serviceVariationId = body.serviceVariationId;
    var serviceVariationVersion = body.serviceVariationVersion;
    var durationMinutes = body.durationMinutes;
    var locationId = body.locationId;
    var startAt = body.startAt;
    var teamMemberId = body.teamMemberId;
    var customerFirstName = body.customerFirstName;
    var customerLastName = body.customerLastName;
    var customerEmail = body.customerEmail;
    var customerPhone = body.customerPhone;
    var customerNote = body.customerNote;

    if (!serviceVariationId || !locationId || !startAt || !customerFirstName || !customerEmail) {
        return respond(400, { error: 'Missing required booking fields' });
    }

    // Search for existing customer by email
    var customerId = null;
    try {
        var searchResult = await squareRequest('POST', '/customers/search', {
            query: {
                filter: {
                    email_address: {
                        exact: customerEmail
                    }
                }
            }
        });
        if (searchResult.customers && searchResult.customers.length > 0) {
            customerId = searchResult.customers[0].id;
        }
    } catch (e) {
        // Customer search failed, will create new
    }

    // Create customer if not found
    if (!customerId) {
        var customerResult = await squareRequest('POST', '/customers', {
            given_name: customerFirstName,
            family_name: customerLastName || '',
            email_address: customerEmail,
            phone_number: customerPhone || ''
        });
        customerId = customerResult.customer.id;
    }

    // Build appointment segment
    var appointmentSegment = {
        service_variation_id: serviceVariationId,
        service_variation_version: serviceVariationVersion || 1,
        duration_minutes: durationMinutes || 60
    };
    if (teamMemberId) {
        appointmentSegment.team_member_id = teamMemberId;
    }

    // Create booking
    var idempotencyKey = Date.now() + '-' + Math.random().toString(36).substring(2, 11);
    var bookingResult = await squareRequest('POST', '/bookings', {
        booking: {
            appointment_segments: [appointmentSegment],
            customer_id: customerId,
            customer_note: customerNote || '',
            location_id: locationId,
            start_at: startAt
        },
        idempotency_key: idempotencyKey
    });

    return respond(200, {
        booking: bookingResult.booking,
        message: 'Booking created successfully'
    });
}

// ── Main Handler ─────────────────────────────────────────────────────
exports.handler = async function(event) {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }

    try {
        var action = event.queryStringParameters && event.queryStringParameters.action;

        switch (action) {
            case 'services':
                return await getServices();
            case 'availability':
                return await getAvailability(event.queryStringParameters);
            case 'book':
                return await createBooking(JSON.parse(event.body || '{}'));
            default:
                return respond(400, {
                    error: 'Invalid action. Use: services, availability, or book'
                });
        }
    } catch (err) {
        console.error('Lambda error:', err);
        return respond(500, {
            error: 'Internal server error',
            details: err.message
        });
    }
};
