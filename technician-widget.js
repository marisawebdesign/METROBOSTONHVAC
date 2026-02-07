/* ==================== TECHNICIAN AVAILABILITY WIDGET ==================== */
/* Geolocation-based widget showing nearby technician availability */

(function() {
    'use strict';

    // ── Configuration ──
    var HQ_LAT = 42.1251;
    var HQ_LNG = -71.0995;
    var MAX_RADIUS_MILES = 30;
    var TECH_MIN_DISTANCE = 5;
    var TECH_MAX_DISTANCE = 10;
    var POPUP_DELAY = 3000;
    var POPUP_DURATION = 12000;

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

    // ── Generate Random Technician Locations ──
    function generateTechLocations(userLat, userLng) {
        var count = Math.floor(Math.random() * 3) + 2; // 2-4 technicians
        var techs = [];
        var names = ['Mike R.', 'Dave S.', 'Chris M.', 'Tom K.'];
        var vehicles = ['Service Van #12', 'Service Van #07', 'Service Van #19', 'Service Van #03'];

        for (var i = 0; i < count; i++) {
            var angle = Math.random() * 2 * Math.PI;
            var dist = TECH_MIN_DISTANCE + Math.random() * (TECH_MAX_DISTANCE - TECH_MIN_DISTANCE);
            var dLat = (dist / 69.0) * Math.cos(angle);
            var dLng = (dist / (69.0 * Math.cos(userLat * Math.PI / 180))) * Math.sin(angle);

            techs.push({
                lat: userLat + dLat,
                lng: userLng + dLng,
                name: names[i],
                vehicle: vehicles[i],
                distance: dist.toFixed(1)
            });
        }
        return techs;
    }

    // ── Build Popup HTML ──
    function buildPopupHTML(techCount) {
        return '<div class="tech-popup" id="techPopup">' +
            '<button class="tech-popup-close" id="techPopupClose" aria-label="Close notification">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<line x1="18" y1="6" x2="6" y2="18"></line>' +
                    '<line x1="6" y1="6" x2="18" y2="18"></line>' +
                '</svg>' +
            '</button>' +
            '<div class="tech-popup-icon">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>' +
                    '<polyline points="14 2 14 8 20 8"></polyline>' +
                    '<line x1="16" y1="13" x2="8" y2="13"></line>' +
                    '<line x1="16" y1="17" x2="8" y2="17"></line>' +
                    '<polyline points="10 9 9 9 8 9"></polyline>' +
                '</svg>' +
            '</div>' +
            '<div class="tech-popup-body">' +
                '<div class="tech-popup-text">' +
                    '<span class="tech-popup-dot"></span>' +
                    '<span class="count">' + techCount + ' technician' + (techCount !== 1 ? 's' : '') + '</span> available near you right now' +
                '</div>' +
                '<button class="tech-popup-link" id="techViewMap">' +
                    'View on Map' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                        '<line x1="5" y1="12" x2="19" y2="12"></line>' +
                        '<polyline points="12 5 19 12 12 19"></polyline>' +
                    '</svg>' +
                '</button>' +
            '</div>' +
        '</div>';
    }

    // ── Build Map Modal HTML ──
    function buildMapHTML() {
        return '<div class="tech-map-overlay" id="techMapOverlay">' +
            '<div class="tech-map-card">' +
                '<div class="tech-map-header">' +
                    '<h3>TECHNICIANS <span>NEAR YOU</span></h3>' +
                    '<button class="tech-map-close" id="techMapClose" aria-label="Close map">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<line x1="18" y1="6" x2="6" y2="18"></line>' +
                            '<line x1="6" y1="6" x2="18" y2="18"></line>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
                '<div class="tech-map-container" id="techMapContainer"></div>' +
                '<div class="tech-map-legend">' +
                    '<div class="tech-legend-item">' +
                        '<div class="tech-legend-dot user"></div>' +
                        'Your Location' +
                    '</div>' +
                    '<div class="tech-legend-item">' +
                        '<div class="tech-legend-dot tech"></div>' +
                        'Available Technician' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    // ── Initialize Map ──
    function initMap(userLat, userLng, techs) {
        var map = L.map('techMapContainer', {
            zoomControl: true,
            scrollWheelZoom: false
        }).setView([userLat, userLng], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map);

        // User marker
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

        // Technician markers
        var techIcon = L.divIcon({
            className: 'tech-marker',
            html: '<div class="tech-marker-inner"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        var bounds = L.latLngBounds([[userLat, userLng]]);

        techs.forEach(function(tech) {
            L.marker([tech.lat, tech.lng], { icon: techIcon })
                .addTo(map)
                .bindPopup(
                    '<strong>' + tech.name + '</strong><br>' +
                    tech.vehicle + '<br>' +
                    '<span style="color:#ff6b35;font-weight:600;">' + tech.distance + ' mi away</span>'
                );
            bounds.extend([tech.lat, tech.lng]);
        });

        map.fitBounds(bounds.pad(0.3));

        return map;
    }

    // ── Main Widget Logic ──
    function startWidget() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            function(position) {
                var userLat = position.coords.latitude;
                var userLng = position.coords.longitude;

                // Check distance from HQ
                var distance = haversine(userLat, userLng, HQ_LAT, HQ_LNG);
                if (distance > MAX_RADIUS_MILES) return;

                // Generate technician locations
                var techs = generateTechLocations(userLat, userLng);
                var techCount = techs.length;

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
                widgetContainer.innerHTML = buildPopupHTML(techCount) + fabHTML + buildMapHTML();
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

                // Show popup after delay
                setTimeout(function() {
                    popup.classList.add('visible');

                    // Auto-hide after duration, then show fab
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
                fab.addEventListener('click', function() {
                    hideFab();
                    overlay.classList.add('active');

                    if (!mapInstance) {
                        setTimeout(function() {
                            mapInstance = initMap(userLat, userLng, techs);
                        }, 100);
                    } else {
                        setTimeout(function() {
                            mapInstance.invalidateSize();
                        }, 100);
                    }
                });

                // View Map from popup
                document.getElementById('techViewMap').addEventListener('click', function() {
                    popup.classList.remove('visible');
                    if (autoHideTimer) clearTimeout(autoHideTimer);
                    overlay.classList.add('active');

                    if (!mapInstance) {
                        setTimeout(function() {
                            mapInstance = initMap(userLat, userLng, techs);
                        }, 100);
                    } else {
                        setTimeout(function() {
                            mapInstance.invalidateSize();
                        }, 100);
                    }
                });

                // Close map modal → show fab
                function closeMap() {
                    overlay.classList.remove('active');
                    showFab();
                }

                document.getElementById('techMapClose').addEventListener('click', closeMap);

                overlay.addEventListener('click', function(e) {
                    if (e.target === overlay) closeMap();
                });

                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && overlay.classList.contains('active')) {
                        closeMap();
                    }
                });
            },
            function() {
                // Geolocation denied or failed — silently do nothing
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
