/* ==================== TECHNICIAN AVAILABILITY WIDGET ==================== */
/* Geolocation-based widget showing nearby technician availability */

(function() {
    'use strict';

    // ── Configuration ──
    var HQ_LAT = 42.1251;
    var HQ_LNG = -71.0995;
    var MAX_RADIUS_MILES = 30;
    var TECH_MIN_DISTANCE = 4;
    var TECH_MAX_DISTANCE = 12;
    var TECH_RADIUS_MILES = 1.5;
    var POPUP_DELAY = 3000;
    var POPUP_DURATION = 12000;
    var UPDATE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

    // ── Seeded PRNG (consistent within 30-min windows) ──
    function createSeededRandom(lat, lng) {
        var timeBlock = Math.floor(Date.now() / UPDATE_INTERVAL_MS);
        var latBlock = Math.round(lat * 10);
        var lngBlock = Math.round(lng * 10);
        var seed = timeBlock * 73856093 + latBlock * 19349663 + lngBlock * 83492791;

        return function() {
            seed = (seed * 16807 + 0) % 2147483647;
            return (seed & 0x7fffffff) / 2147483647;
        };
    }

    // ── Haversine Distance (miles) ──
    function haversine(lat1, lon1, lat2, lon2) {
        var R = 3958.8;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLon = (lon2 - lon1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ── Generate Technician Locations (seeded for consistency) ──
    function generateTechLocations(centerLat, centerLng, rng) {
        var count = Math.floor(rng() * 3) + 2; // 2-4 technicians
        var techs = [];
        var labels = ['Technician Area A', 'Technician Area B', 'Technician Area C', 'Technician Area D'];

        for (var i = 0; i < count; i++) {
            var angle = rng() * 2 * Math.PI;
            var dist = TECH_MIN_DISTANCE + rng() * (TECH_MAX_DISTANCE - TECH_MIN_DISTANCE);
            var dLat = (dist / 69.0) * Math.cos(angle);
            var dLng = (dist / (69.0 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);

            techs.push({
                lat: centerLat + dLat,
                lng: centerLng + dLng,
                label: labels[i],
                distance: dist.toFixed(1)
            });
        }
        return techs;
    }

    // ── Build Popup HTML ──
    // isLocal: true = user is in service area, false = outside or no geo
    function buildPopupHTML(techCount, isLocal) {
        var messageText = isLocal
            ? '<span class="count">' + techCount + ' technician' + (techCount !== 1 ? 's' : '') + '</span> available near you'
            : '<span class="count">Live Technician Map</span> — see our team in the field';

        var linkText = isLocal ? 'View on Map' : 'View Map';

        return '<div class="tech-popup" id="techPopup">' +
            '<button class="tech-popup-close" id="techPopupClose" aria-label="Close notification">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<line x1="18" y1="6" x2="6" y2="18"></line>' +
                    '<line x1="6" y1="6" x2="18" y2="18"></line>' +
                '</svg>' +
            '</button>' +
            '<div class="tech-popup-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>' +
                    '<circle cx="12" cy="10" r="3"></circle>' +
                '</svg>' +
            '</div>' +
            '<div class="tech-popup-body">' +
                '<div class="tech-popup-text">' +
                    '<span class="tech-popup-dot"></span>' +
                    messageText +
                '</div>' +
                '<button class="tech-popup-link" id="techViewMap">' +
                    linkText +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<line x1="5" y1="12" x2="19" y2="12"></line>' +
                        '<polyline points="12 5 19 12 12 19"></polyline>' +
                    '</svg>' +
                '</button>' +
            '</div>' +
        '</div>';
    }

    // ── Build Map Modal HTML ──
    function buildMapHTML(isLocal) {
        var headerText = isLocal
            ? 'TECHNICIANS <span>NEAR YOU</span>'
            : 'LIVE <span>TECHNICIAN MAP</span>';

        var legendItems = '';
        if (isLocal) {
            legendItems += '<div class="tech-legend-item">' +
                '<div class="tech-legend-dot user"></div>' +
                'Your Location' +
            '</div>';
        }
        legendItems += '<div class="tech-legend-item">' +
            '<div class="tech-legend-dot tech"></div>' +
            'Technician Area' +
        '</div>';

        return '<div class="tech-map-overlay" id="techMapOverlay">' +
            '<div class="tech-map-card">' +
                '<div class="tech-map-header">' +
                    '<h3>' + headerText + '</h3>' +
                    '<button class="tech-map-close" id="techMapClose" aria-label="Close map">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<line x1="18" y1="6" x2="6" y2="18"></line>' +
                            '<line x1="6" y1="6" x2="18" y2="18"></line>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
                '<div class="tech-map-container" id="techMapContainer"></div>' +
                '<div class="tech-map-legend">' +
                    legendItems +
                '</div>' +
                '<div class="tech-map-disclaimer">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">' +
                        '<circle cx="12" cy="12" r="10"></circle>' +
                        '<line x1="12" y1="16" x2="12" y2="12"></line>' +
                        '<line x1="12" y1="8" x2="12.01" y2="8"></line>' +
                    '</svg>' +
                    'Map is updated every 30 minutes and shows approximate technician locations.' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    // ── Initialize Map ──
    // userLat/userLng = null for remote mode (centers on HQ)
    function initMap(userLat, userLng, techs, isLocal) {
        var centerLat = isLocal ? userLat : HQ_LAT;
        var centerLng = isLocal ? userLng : HQ_LNG;

        var map = L.map('techMapContainer', {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([centerLat, centerLng], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        var bounds = L.latLngBounds([[centerLat, centerLng]]);

        // User marker (only for local/in-area users)
        if (isLocal) {
            var userIcon = L.divIcon({
                className: 'tech-marker',
                html: '<div class="user-marker-inner">' +
                    '<svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">' +
                        '<circle cx="12" cy="12" r="5"></circle>' +
                    '</svg>' +
                '</div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });

            L.marker([userLat, userLng], { icon: userIcon })
                .addTo(map)
                .bindPopup('<strong>Your Location</strong>');
        }

        // Technician radius circles (approximate areas)
        var radiusMeters = TECH_RADIUS_MILES * 1609.34;

        techs.forEach(function(tech) {
            L.circle([tech.lat, tech.lng], {
                radius: radiusMeters,
                color: '#ff6b35',
                weight: 2,
                opacity: 0.7,
                fillColor: '#ff6b35',
                fillOpacity: 0.15
            }).addTo(map).bindPopup(
                '<strong>' + tech.label + '</strong>' +
                (isLocal ? '<br><span style="color:#ff6b35;font-weight:600;">~' + tech.distance + ' mi from you</span>' : '')
            );
            var techLatLng = L.latLng(tech.lat, tech.lng);
            bounds.extend(techLatLng.toBounds(radiusMeters * 2));
        });

        map.fitBounds(bounds.pad(0.15));

        return map;
    }

    // ── Wire Up Widget UI ──
    function mountWidget(techs, techCount, isLocal, userLat, userLng) {
        // Build fab button HTML
        var fabHTML = '<button class="tech-fab" id="techFab" aria-label="View nearby technicians">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>' +
                '<circle cx="12" cy="10" r="3"></circle>' +
            '</svg>' +
            '<span class="tech-fab-badge">' + techCount + '</span>' +
        '</button>';

        // Inject popup, fab, and map modal HTML
        var widgetContainer = document.createElement('div');
        widgetContainer.id = 'techWidgetRoot';
        widgetContainer.innerHTML = buildPopupHTML(techCount, isLocal) + fabHTML + buildMapHTML(isLocal);
        document.body.appendChild(widgetContainer);

        var popup = document.getElementById('techPopup');
        var fab = document.getElementById('techFab');
        var overlay = document.getElementById('techMapOverlay');
        var mapInstance = null;
        var autoHideTimer = null;

        function showFab() {
            setTimeout(function() {
                fab.classList.add('visible');
            }, 400);
        }

        function hideFab() {
            fab.classList.remove('visible');
        }

        function openMap() {
            hideFab();
            overlay.classList.add('active');

            if (!mapInstance) {
                setTimeout(function() {
                    mapInstance = initMap(userLat, userLng, techs, isLocal);
                }, 100);
            } else {
                setTimeout(function() {
                    mapInstance.invalidateSize();
                }, 100);
            }
        }

        function closeMap() {
            overlay.classList.remove('active');
            showFab();
        }

        // Show popup after delay
        setTimeout(function() {
            popup.classList.add('visible');

            autoHideTimer = setTimeout(function() {
                popup.classList.remove('visible');
                showFab();
            }, POPUP_DURATION);
        }, POPUP_DELAY);

        // Close popup → show fab
        document.getElementById('techPopupClose').addEventListener('click', function() {
            popup.classList.remove('visible');
            if (autoHideTimer) clearTimeout(autoHideTimer);
            showFab();
        });

        // Fab click → open map
        fab.addEventListener('click', openMap);

        // View Map from popup
        document.getElementById('techViewMap').addEventListener('click', function() {
            popup.classList.remove('visible');
            if (autoHideTimer) clearTimeout(autoHideTimer);
            openMap();
        });

        // Close map
        document.getElementById('techMapClose').addEventListener('click', closeMap);

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeMap();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && overlay.classList.contains('active')) {
                closeMap();
            }
        });
    }

    // ── Show Remote Widget (outside service area or no geo) ──
    function showRemoteWidget() {
        var rng = createSeededRandom(HQ_LAT, HQ_LNG);
        var techs = generateTechLocations(HQ_LAT, HQ_LNG, rng);
        mountWidget(techs, techs.length, false, null, null);
    }

    // ── Main Widget Logic ──
    function startWidget() {
        if (!navigator.geolocation) {
            showRemoteWidget();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function(position) {
                var userLat = position.coords.latitude;
                var userLng = position.coords.longitude;

                var distance = haversine(userLat, userLng, HQ_LAT, HQ_LNG);

                if (distance > MAX_RADIUS_MILES) {
                    // Outside service area — show live map centered on HQ
                    showRemoteWidget();
                } else {
                    // In service area — show personalized widget
                    var rng = createSeededRandom(userLat, userLng);
                    var techs = generateTechLocations(userLat, userLng, rng);
                    mountWidget(techs, techs.length, true, userLat, userLng);
                }
            },
            function() {
                // Geolocation denied or failed — show live map
                showRemoteWidget();
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    }

    // ── Start on DOM Ready ──
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startWidget);
    } else {
        startWidget();
    }
})();
