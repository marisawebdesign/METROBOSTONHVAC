(function() {
    var map = L.map('serviceAreaMap', {
        center: [42.16, -70.98],
        zoom: 10,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 16,
        minZoom: 9
    }).addTo(map);

    var cities = {
        boston:     { lat: 42.3601, lng: -71.0589, region: 'metro' },
        brookline: { lat: 42.3318, lng: -71.1212, region: 'metro' },
        cambridge: { lat: 42.3736, lng: -71.1097, region: 'metro' },
        somerville:{ lat: 42.3876, lng: -71.0995, region: 'metro' },
        newton:    { lat: 42.3370, lng: -71.2092, region: 'metro' },
        quincy:    { lat: 42.2529, lng: -71.0023, region: 'metro' },
        dedham:    { lat: 42.2418, lng: -71.1663, region: 'metro' },
        milton:    { lat: 42.2498, lng: -71.0662, region: 'metro' },
        needham:   { lat: 42.2804, lng: -71.2328, region: 'metro' },
        wellesley: { lat: 42.2968, lng: -71.2924, region: 'metro' },
        waltham:   { lat: 42.3765, lng: -71.2356, region: 'metro' },
        medford:   { lat: 42.4184, lng: -71.1062, region: 'metro' },
        malden:    { lat: 42.4251, lng: -71.0662, region: 'metro' },
        watertown: { lat: 42.3709, lng: -71.1828, region: 'metro' },
        arlington: { lat: 42.4153, lng: -71.1564, region: 'metro' },
        belmont:   { lat: 42.3959, lng: -71.1789, region: 'metro' },
        lexington: { lat: 42.4473, lng: -71.2245, region: 'metro' },
        norwood:   { lat: 42.1946, lng: -71.1995, region: 'metro' },
        canton:    { lat: 42.1584, lng: -71.1448, region: 'metro' },
        weston:    { lat: 42.3668, lng: -71.3031, region: 'metro' },
        stoughton: { lat: 42.1251, lng: -71.0984, region: 'south-shore' },
        braintree: { lat: 42.2041, lng: -70.9992, region: 'south-shore' },
        weymouth:  { lat: 42.2188, lng: -70.9396, region: 'south-shore' },
        randolph:  { lat: 42.1626, lng: -71.0418, region: 'south-shore' },
        brockton:  { lat: 42.0834, lng: -71.0184, region: 'south-shore' },
        avon:      { lat: 42.1307, lng: -71.0412, region: 'south-shore' },
        holbrook:  { lat: 42.1551, lng: -70.9904, region: 'south-shore' },
        abington:  { lat: 42.1048, lng: -70.9454, region: 'south-shore' },
        rockland:  { lat: 42.1307, lng: -70.9076, region: 'south-shore' },
        hanover:   { lat: 42.1132, lng: -70.8120, region: 'south-shore' },
        hingham:   { lat: 42.2418, lng: -70.8898, region: 'south-shore' },
        norwell:   { lat: 42.1612, lng: -70.7932, region: 'south-shore' },
        scituate:  { lat: 42.1951, lng: -70.7256, region: 'south-shore' },
        marshfield:{ lat: 42.0918, lng: -70.7076, region: 'south-shore' },
        plymouth:  { lat: 41.9584, lng: -70.6673, region: 'south-shore' },
        easton:    { lat: 42.0243, lng: -71.1284, region: 'south-shore' },
        sharon:    { lat: 42.1237, lng: -71.1784, region: 'south-shore' },
        foxborough:{ lat: 42.0654, lng: -71.2476, region: 'south-shore' },
        mansfield: { lat: 42.0334, lng: -71.2189, region: 'south-shore' },
        taunton:   { lat: 41.9001, lng: -71.0898, region: 'south-shore' }
    };

    // Boston Metro polygon — follows coastline from Nahant through Boston Harbor
    L.polygon([
        [42.455, -71.285], [42.455, -71.190], [42.445, -71.110],
        [42.430, -71.055], [42.425, -71.020],
        // Coastline: Revere Beach → Boston Harbor
        [42.408, -70.990], [42.385, -70.975], [42.370, -70.965],
        [42.365, -70.960], [42.355, -70.955],
        // Boston Harbor / Dorchester Bay
        [42.340, -70.960], [42.330, -70.965], [42.315, -70.970],
        [42.300, -70.975], [42.280, -70.975],
        // Quincy coastline
        [42.260, -70.970], [42.245, -70.965], [42.235, -70.970],
        // Inland from Quincy → Canton → Norwood
        [42.220, -71.000], [42.195, -71.040],
        [42.160, -71.100], [42.155, -71.135],
        [42.170, -71.175], [42.190, -71.210],
        // Needham → Wellesley → Weston
        [42.225, -71.240], [42.265, -71.280], [42.300, -71.310],
        [42.340, -71.320], [42.380, -71.310],
        [42.420, -71.295], [42.440, -71.285]
    ], {
        color: '#ff6b35',
        weight: 2.5,
        fillColor: '#ff6b35',
        fillOpacity: 0.10,
        smoothFactor: 1.5
    }).addTo(map);

    // South Shore polygon — follows coastline from Quincy to Plymouth
    L.polygon([
        // Shared border with Metro at Quincy
        [42.235, -70.970], [42.245, -70.930],
        // Hull / Hingham Harbor coastline
        [42.270, -70.905], [42.265, -70.885], [42.255, -70.870],
        [42.248, -70.855],
        // Hingham → Cohasset → Scituate coast
        [42.235, -70.840], [42.220, -70.810], [42.210, -70.780],
        [42.200, -70.730], [42.195, -70.715],
        // Marshfield → Duxbury coast
        [42.170, -70.700], [42.140, -70.680], [42.105, -70.665],
        [42.070, -70.660],
        // Plymouth coast
        [42.020, -70.650], [41.975, -70.645], [41.950, -70.650],
        // Plymouth inland → Taunton
        [41.925, -70.700], [41.895, -70.810],
        [41.885, -70.950], [41.880, -71.050],
        [41.890, -71.100],
        // Inland: Taunton → Mansfield → Foxborough
        [41.920, -71.140], [41.960, -71.200],
        [42.020, -71.250], [42.060, -71.265],
        // Foxborough → Sharon → Stoughton
        [42.100, -71.230], [42.125, -71.195],
        [42.150, -71.155], [42.155, -71.135],
        // Rejoin metro boundary
        [42.160, -71.100], [42.195, -71.040],
        [42.220, -71.000], [42.235, -70.970]
    ], {
        color: '#1a3a52',
        weight: 2.5,
        fillColor: '#1a3a52',
        fillOpacity: 0.08,
        smoothFactor: 1.5
    }).addTo(map);

    // City markers
    var markers = {};
    Object.keys(cities).forEach(function(key) {
        var c = cities[key];
        var color = c.region === 'metro' ? '#ff6b35' : '#1a3a52';
        markers[key] = L.circleMarker([c.lat, c.lng], {
            radius: 5,
            fillColor: color,
            color: '#fff',
            weight: 2,
            fillOpacity: 0.8
        }).addTo(map);
        var name = key.charAt(0).toUpperCase() + key.slice(1);
        markers[key].bindTooltip(name, { direction: 'top', offset: [0, -8] });
    });

    // City list hover/click interaction
    var activeItem = null;
    var activeMarker = null;

    document.querySelectorAll('.map-city-list li').forEach(function(li) {
        var cityKey = li.getAttribute('data-city');

        li.addEventListener('mouseenter', function() {
            if (activeItem) activeItem.classList.remove('active');
            if (activeMarker) { activeMarker.setRadius(5); activeMarker.closeTooltip(); }
            li.classList.add('active');
            activeItem = li;
            var m = markers[cityKey];
            if (m) { m.setRadius(12); m.openTooltip(); activeMarker = m; }
        });

        li.addEventListener('mouseleave', function() {
            li.classList.remove('active');
            activeItem = null;
            if (activeMarker) { activeMarker.setRadius(5); activeMarker.closeTooltip(); activeMarker = null; }
        });

        li.addEventListener('click', function() {
            var c = cities[cityKey];
            if (c) map.flyTo([c.lat, c.lng], 13, { duration: 0.8 });
        });
    });

    // Region labels on map
    L.marker([42.36, -71.12], {
        icon: L.divIcon({
            className: 'region-label-icon',
            html: '<span style="background:rgba(255,107,53,0.9);color:#fff;padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:1.5px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15)">BOSTON METRO</span>',
            iconSize: [120, 26], iconAnchor: [60, 13]
        })
    }).addTo(map);

    L.marker([42.06, -70.90], {
        icon: L.divIcon({
            className: 'region-label-icon',
            html: '<span style="background:rgba(26,58,82,0.9);color:#fff;padding:5px 14px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:1.5px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15)">SOUTH SHORE</span>',
            iconSize: [120, 26], iconAnchor: [60, 13]
        })
    }).addTo(map);
})();

    // Scroll-triggered reveal animations
    (function() {
        var revealElements = document.querySelectorAll('.scroll-reveal');
        if (!revealElements.length) return;

        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -40px 0px'
        });

        revealElements.forEach(function(el) {
            observer.observe(el);
        });
    })();

    // Tools carousel — arrow navigation + dots + swipe
    (function() {
        var track = document.getElementById('toolsTrack');
        var dots = document.querySelectorAll('#toolsDots .tools-dot');
        var prevBtn = document.getElementById('toolsPrev');
        var nextBtn = document.getElementById('toolsNext');
        if (!track) return;

        var current = 0;
        var total = track.children.length;

        function goTo(index) {
            if (index < 0) index = total - 1;
            if (index >= total) index = 0;
            current = index;
            track.style.transform = 'translateX(-' + (current * 100) + '%)';
            for (var i = 0; i < dots.length; i++) {
                dots[i].classList.toggle('active', i === current);
            }
        }

        prevBtn.addEventListener('click', function() { goTo(current - 1); });
        nextBtn.addEventListener('click', function() { goTo(current + 1); });

        dots.forEach(function(dot, i) {
            dot.addEventListener('click', function() { goTo(i); });
        });

        // Touch/swipe support
        var startX = 0;
        var moving = false;
        track.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            moving = true;
        }, { passive: true });
        track.addEventListener('touchend', function(e) {
            if (!moving) return;
            var diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) {
                goTo(diff > 0 ? current + 1 : current - 1);
            }
            moving = false;
        }, { passive: true });
    })();

    // Reviews carousel — full-featured with auto-advance, pause, keyboard nav, ARIA
    (function() {
        var track = document.getElementById('reviewsTrack');
        var dotsContainer = document.getElementById('reviewsDots');
        var prevBtn = document.getElementById('reviewsPrev');
        var nextBtn = document.getElementById('reviewsNext');
        if (!track || !dotsContainer) return;

        var section = track.closest('.reviews-section');
        var cards = track.children;
        var current = 0;
        var autoplayInterval = null;
        var autoplayDelay = 6000;

        // ARIA setup
        track.setAttribute('role', 'list');
        track.setAttribute('aria-label', 'Customer reviews');
        for (var c = 0; c < cards.length; c++) {
            cards[c].setAttribute('role', 'listitem');
        }
        dotsContainer.setAttribute('role', 'tablist');
        dotsContainer.setAttribute('aria-label', 'Review pages');

        function getCardsPerView() {
            var width = window.innerWidth;
            if (width <= 480) return 1;
            if (width <= 768) return 2;
            return 3;
        }

        function getTotalPages() {
            var perView = getCardsPerView();
            return Math.ceil(cards.length / perView);
        }

        function buildDots() {
            dotsContainer.innerHTML = '';
            var total = getTotalPages();
            for (var i = 0; i < total; i++) {
                var dot = document.createElement('button');
                dot.className = 'reviews-dot' + (i === current ? ' active' : '');
                dot.setAttribute('role', 'tab');
                dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
                dot.setAttribute('aria-label', 'Review page ' + (i + 1) + ' of ' + total);
                dot.addEventListener('click', (function(idx) {
                    return function() { goTo(idx); };
                })(i));
                dotsContainer.appendChild(dot);
            }
        }

        function goTo(index) {
            var total = getTotalPages();
            if (index < 0) index = total - 1;
            if (index >= total) index = 0;
            current = index;

            var perView = getCardsPerView();
            var cardEl = cards[0];
            var style = window.getComputedStyle(cardEl);
            var cardWidth = cardEl.offsetWidth + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
            var offset = current * perView * cardWidth;

            track.style.transform = 'translateX(-' + offset + 'px)';

            var dots = dotsContainer.querySelectorAll('.reviews-dot');
            for (var i = 0; i < dots.length; i++) {
                dots[i].classList.toggle('active', i === current);
                dots[i].setAttribute('aria-selected', i === current ? 'true' : 'false');
            }
        }

        prevBtn.addEventListener('click', function() { goTo(current - 1); });
        nextBtn.addEventListener('click', function() { goTo(current + 1); });

        // Touch/swipe support
        var startX = 0;
        var moving = false;
        track.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            moving = true;
        }, { passive: true });
        track.addEventListener('touchend', function(e) {
            if (!moving) return;
            var diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) {
                goTo(diff > 0 ? current + 1 : current - 1);
            }
            moving = false;
        }, { passive: true });

        // Auto-advance
        function startAutoplay() {
            stopAutoplay();
            autoplayInterval = setInterval(function() {
                goTo(current + 1);
            }, autoplayDelay);
        }

        function stopAutoplay() {
            if (autoplayInterval) {
                clearInterval(autoplayInterval);
                autoplayInterval = null;
            }
        }

        // Pause on hover
        section.addEventListener('mouseenter', stopAutoplay);
        section.addEventListener('mouseleave', startAutoplay);

        // Pause on focus within (for keyboard users)
        section.addEventListener('focusin', stopAutoplay);
        section.addEventListener('focusout', function(e) {
            if (!section.contains(e.relatedTarget)) startAutoplay();
        });

        // Keyboard navigation
        section.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                goTo(current - 1);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                goTo(current + 1);
                e.preventDefault();
            }
        });

        // Rebuild dots on resize
        var resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                var total = getTotalPages();
                if (current >= total) current = total - 1;
                buildDots();
                goTo(current);
            }, 200);
        });

        buildDots();
        startAutoplay();
    })();
