/**
 * Metro Boston HVAC — Booking Page Controller
 *
 * Manages the two-column booking layout:
 *   - Service tab selection (left/top)
 *   - Left panel: dynamic service detail card
 *   - Right panel: Square Appointments embed (iframe)
 *
 * Square Appointments hosted booking page handles scheduling,
 * customer info, and payment ($79 Diagnostic checkout).
 */

(function () {
    'use strict';

    // ── Service data ────────────────────────────────────────────────
    var SERVICES = {
        consult: {
            badge: 'free',
            badgeLabel: 'Free',
            title: 'Free Phone Consultation',
            price: 'FREE',
            description: 'Not sure what you need? Talk through your HVAC issue with a licensed technician over the phone. No cost, no obligation — just honest guidance from a local professional.',
            whatToExpect: [
                'Discuss your heating or cooling concern',
                'Get a professional assessment over the phone',
                'Receive a recommendation and next steps',
                'No cost and no pressure to commit'
            ],
            meta: [
                { icon: 'fa-regular fa-clock', text: '30 minutes' },
                { icon: 'fa-solid fa-phone', text: 'Phone call' }
            ]
        },
        diagnostic: {
            badge: 'paid',
            badgeLabel: '$79',
            title: 'Diagnostic Service Visit',
            price: '$79',
            description: 'A certified HVAC technician comes to your home, performs a full system inspection, and gives you a clear explanation of the issue and your repair options. The $79 fee is waived if you proceed with the recommended repair.',
            whatToExpect: [
                'Thorough inspection of your HVAC system',
                'Identify the root cause of the problem',
                'Clear explanation of repair options and costs',
                'Fee waived if you proceed with repair'
            ],
            meta: [
                { icon: 'fa-regular fa-clock', text: '60 minutes' },
                { icon: 'fa-solid fa-house', text: 'In-home visit' },
                { icon: 'fa-solid fa-credit-card', text: 'Payment via Square at checkout' }
            ]
        }
    };

    // ── DOM references ──────────────────────────────────────────────
    var tabs, detailBody, detailHeading, embedIframe, embedLoading, embedFallback;
    var activeService = null;

    // ── Render service detail into left panel ───────────────────────
    function renderDetail(key) {
        var svc = SERVICES[key];
        if (!svc) return;

        var html = '';
        html += '<div class="panel-fade">';
        html += '<span class="detail-badge ' + svc.badge + '">' + svc.badgeLabel + '</span>';
        html += '<div class="detail-title">' + svc.title + '</div>';
        html += '<div class="detail-price-big">' + svc.price + '</div>';
        html += '<p class="detail-desc">' + svc.description + '</p>';

        // What to Expect
        html += '<div class="detail-section-label">What to Expect</div>';
        html += '<ul class="detail-bullets">';
        for (var i = 0; i < svc.whatToExpect.length; i++) {
            html += '<li><i class="fa-solid fa-check"></i> ' + svc.whatToExpect[i] + '</li>';
        }
        html += '</ul>';

        // Divider
        html += '<div class="detail-divider"></div>';

        // Meta details
        for (var j = 0; j < svc.meta.length; j++) {
            html += '<div class="detail-meta"><i class="' + svc.meta[j].icon + '"></i> ' + svc.meta[j].text + '</div>';
        }

        // Trust indicators
        html += '<div class="detail-trust">';
        html += '<span><i class="fa-solid fa-shield-halved"></i> Licensed #081600137</span>';
        html += '<span><i class="fa-solid fa-star"></i> 5-Star Rated</span>';
        html += '<span><i class="fa-solid fa-bolt"></i> Same-Day Available</span>';
        html += '</div>';

        html += '</div>';

        detailBody.innerHTML = html;
    }

    // ── Tab selection ───────────────────────────────────────────────
    function selectTab(key) {
        if (activeService === key) return;
        activeService = key;

        // Update tab active states
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.getAttribute('data-svc') === key) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        }

        // Update detail card heading
        detailHeading.textContent = SERVICES[key] ? SERVICES[key].title : 'Service Details';

        // Render left-panel detail
        renderDetail(key);
    }

    // ── Iframe load / error handling ────────────────────────────────
    function onIframeLoad() {
        if (embedLoading) {
            embedLoading.classList.add('hidden');
        }
    }

    function onIframeError() {
        if (embedLoading) {
            embedLoading.classList.add('hidden');
        }
        if (embedFallback) {
            embedFallback.style.display = 'block';
        }
        if (embedIframe) {
            embedIframe.style.display = 'none';
        }
    }

    // ── Initialize ──────────────────────────────────────────────────
    function init() {
        tabs = document.querySelectorAll('.svc-tab');
        detailBody = document.getElementById('detailBody');
        detailHeading = document.getElementById('detailHeading');
        embedIframe = document.getElementById('squareEmbed');
        embedLoading = document.getElementById('embedLoading');
        embedFallback = document.getElementById('embedFallback');

        if (!tabs.length || !detailBody) return;

        // Bind tab clicks
        for (var i = 0; i < tabs.length; i++) {
            (function (tab) {
                tab.addEventListener('click', function () {
                    selectTab(tab.getAttribute('data-svc'));
                });
            })(tabs[i]);
        }

        // Iframe events
        if (embedIframe) {
            embedIframe.addEventListener('load', onIframeLoad);
            embedIframe.addEventListener('error', onIframeError);

            // Fallback timeout: if iframe hasn't loaded after 15 seconds, show fallback
            setTimeout(function () {
                if (embedLoading && !embedLoading.classList.contains('hidden')) {
                    onIframeError();
                }
            }, 15000);
        }

        // Auto-select first service tab on load
        if (tabs.length > 0) {
            var firstKey = tabs[0].getAttribute('data-svc');
            selectTab(firstKey);
        }
    }

    // ── Boot ────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
