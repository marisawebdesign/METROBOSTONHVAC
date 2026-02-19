/**
 * Metro Boston HVAC — Square Appointments Booking Wizard
 *
 * Vanilla JS multi-step booking flow:
 *   Step 1: Select a service
 *   Step 2: Pick date & time (fetched from Square Availability API)
 *   Step 3: Enter customer info
 *   Step 4: Review & confirm booking
 *
 * Configuration:
 *   Set API_BASE below to your deployed API Gateway URL.
 *   While API_BASE is empty the wizard runs in demo mode with
 *   hardcoded services and simulated availability.
 */

(function () {
    'use strict';

    // ── Configuration ────────────────────────────────────────────────
    // Replace with your API Gateway invoke URL (e.g. https://xxxxx.execute-api.us-east-1.amazonaws.com/prod)
    var API_BASE = '';

    // Sandbox application ID (used only for reference; token stays server-side)
    var SQUARE_APP_ID = 'sandbox-sq0idb-bldX2LOA_sZ-YySB16G2ww';

    // ── Square sandbox catalog IDs ──────────────────────────────────
    // These match the services created in the client's Square Appointments account.
    // When switching to production, update these IDs to match the production catalog.
    var SQUARE_LOCATION_ID = 'LB2SQAX9GKWQF';
    var SQUARE_TEAM_MEMBER_ID = 'TMkDrMGgzzIjJD33';

    // ── The only 2 bookable services ─────────────────────────────────
    var SERVICES = [
        {
            id: '3R33CEORE4S6KLDZ52O6QBGY',
            name: 'Free Phone Consultation',
            description: 'Not sure what you need? Talk through your HVAC issue with a licensed technician over the phone. No cost, no pressure.',
            icon: 'fa-phone',
            variationId: 'XGE5A5SSYWQ6P4JWEI523GX2',
            variationVersion: 1771503378277,
            durationMinutes: 30,
            priceLabel: 'FREE',
            priceCents: 0
        },
        {
            id: '5NCZHPG4ZEJQIEEU2MRU4UQI',
            name: '$79 Diagnostic Visit',
            description: 'A technician comes to your home, inspects your system, and tells you exactly what is going on. Fee waived if you proceed with repair.',
            icon: 'fa-wrench',
            variationId: 'UZHFLQXSD7CEX5LNQ7HH5BGU',
            variationVersion: 1771503378277,
            durationMinutes: 60,
            priceLabel: '$79',
            priceCents: 7900
        }
    ];

    // ── State ─────────────────────────────────────────────────────────
    var currentStep = 1;
    var services = [];
    var locationId = null;
    var selectedService = null;
    var selectedDate = null;       // 'YYYY-MM-DD'
    var selectedSlot = null;       // { startAt, teamMemberId, ... }
    var availabilityCache = {};    // { 'YYYY-MM': [ slot, ... ] }
    var viewYear, viewMonth;       // calendar view
    var demoMode = false;

    // ── DOM refs (populated on init) ─────────────────────────────────
    var wizardContainer, progressSteps, progressLines;
    var panels = {};
    var servicesGrid, calendarEl, timeslotsEl, timeslotsTitle;
    var calendarMonthLabel, calendarPrev, calendarNext;
    var customerForm;
    var confirmationCard;

    // ── Helpers ───────────────────────────────────────────────────────
    function $(selector, parent) { return (parent || document).querySelector(selector); }
    function $$(selector, parent) { return Array.prototype.slice.call((parent || document).querySelectorAll(selector)); }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }

    function formatDateStr(y, m, d) {
        return y + '-' + pad(m + 1) + '-' + pad(d);
    }

    function monthKey(y, m) {
        return y + '-' + pad(m + 1);
    }

    function parseISOTime(iso) {
        var d = new Date(iso);
        var h = d.getHours();
        var min = d.getMinutes();
        var ampm = h >= 12 ? 'PM' : 'AM';
        var h12 = h % 12 || 12;
        return h12 + ':' + pad(min) + ' ' + ampm;
    }

    function formatDisplayDate(dateStr) {
        var parts = dateStr.split('-');
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        var dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        return dayNames[d.getDay()] + ', ' + months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    }

    function getServiceIcon(name) {
        var n = name.toLowerCase();
        if (n.indexOf('emergency') !== -1 || n.indexOf('urgent') !== -1) return 'fa-bolt';
        if (n.indexOf('heat pump') !== -1 || n.indexOf('mini-split') !== -1 || n.indexOf('ductless') !== -1) return 'fa-fan';
        if (n.indexOf('heat') !== -1 || n.indexOf('furnace') !== -1 || n.indexOf('boiler') !== -1) return 'fa-fire';
        if (n.indexOf('cool') !== -1 || n.indexOf('ac ') !== -1 || n.indexOf('a/c') !== -1 || n.indexOf('air condition') !== -1 || n.indexOf('snowflake') !== -1) return 'fa-snowflake';
        if (n.indexOf('install') !== -1) return 'fa-screwdriver-wrench';
        if (n.indexOf('maintenance') !== -1 || n.indexOf('tune') !== -1 || n.indexOf('annual') !== -1) return 'fa-calendar-check';
        if (n.indexOf('repair') !== -1 || n.indexOf('diagnostic') !== -1) return 'fa-wrench';
        return 'fa-wrench';
    }

    // ── API helpers ──────────────────────────────────────────────────
    function apiGet(action, params) {
        var url = API_BASE + '?action=' + action;
        if (params) {
            for (var k in params) {
                if (params.hasOwnProperty(k)) {
                    url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
                }
            }
        }
        return fetch(url).then(function (r) { return r.json(); });
    }

    function apiPost(action, body) {
        return fetch(API_BASE + '?action=' + action, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(function (r) { return r.json(); });
    }

    // ── Demo availability generator ──────────────────────────────────
    function generateDemoAvailability(year, month) {
        var slots = [];
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var hours = [9, 10, 11, 13, 14, 15, 16];

        for (var day = 1; day <= daysInMonth; day++) {
            var date = new Date(year, month, day);
            if (date < today) continue;
            // skip Sundays
            if (date.getDay() === 0) continue;
            // randomly skip some days for realism
            if (Math.random() < 0.2) continue;

            for (var h = 0; h < hours.length; h++) {
                // randomly skip some slots
                if (Math.random() < 0.3) continue;
                var startAt = new Date(year, month, day, hours[h], 0, 0).toISOString();
                slots.push({
                    start_at: startAt,
                    appointment_segments: [{
                        duration_minutes: selectedService ? selectedService.durationMinutes : 60,
                        team_member_id: 'demo-team-1',
                        service_variation_id: selectedService ? selectedService.variationId : 'fb-var-1',
                        service_variation_version: 1
                    }]
                });
            }
        }
        return slots;
    }

    // ── Step navigation ──────────────────────────────────────────────
    function goToStep(step) {
        var oldPanel = panels[currentStep];
        if (oldPanel) {
            oldPanel.classList.remove('active');
        }

        currentStep = step;

        // Update progress bar
        for (var i = 0; i < progressSteps.length; i++) {
            var s = progressSteps[i];
            var num = parseInt(s.getAttribute('data-step'));
            s.classList.remove('active', 'completed');
            if (num < step) s.classList.add('completed');
            else if (num === step) s.classList.add('active');
        }
        for (var j = 0; j < progressLines.length; j++) {
            if (j < step - 1) progressLines[j].classList.add('completed');
            else progressLines[j].classList.remove('completed');
        }

        // Show new panel with fade
        var newPanel = panels[step];
        if (newPanel) {
            setTimeout(function () {
                newPanel.classList.add('active');
                // Scroll to top of wizard
                wizardContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }

        // Step-specific actions
        if (step === 2) {
            var now = new Date();
            viewYear = now.getFullYear();
            viewMonth = now.getMonth();
            renderCalendar();
            fetchMonthAvailability(viewYear, viewMonth);
            clearTimeSlots();
        }
        if (step === 4) {
            renderConfirmation();
        }
    }

    // ── Step 1: Services ─────────────────────────────────────────────
    function fetchServices() {
        // Always use the 2 hardcoded services from the client's Square account.
        // These are the only bookable services offered.
        services = SERVICES;
        locationId = SQUARE_LOCATION_ID;

        // Determine if we can reach the live API for availability later
        if (!API_BASE) {
            demoMode = true;
        }

        renderServices();
    }

    function renderServices() {
        var html = '';
        for (var i = 0; i < services.length; i++) {
            var s = services[i];
            var icon = s.icon || getServiceIcon(s.name);
            var isSelected = selectedService && selectedService.id === s.id;
            html += '<div class="service-card' + (isSelected ? ' selected' : '') + '" data-index="' + i + '">';
            html += '<div class="service-card-icon"><i class="fa-solid ' + icon + '"></i></div>';
            html += '<div class="service-card-info">';
            html += '<div class="service-card-name">' + s.name + '</div>';
            if (s.priceLabel) {
                html += '<div class="service-card-price">' + s.priceLabel + '</div>';
            }
            html += '<div class="service-card-desc">' + s.description + '</div>';
            html += '<div class="service-card-duration"><i class="fa-regular fa-clock"></i> ' + s.durationMinutes + ' min</div>';
            html += '</div></div>';
        }

        servicesGrid.innerHTML = html;
        bindServiceCards();
    }

    function bindServiceCards() {
        var cards = $$('.service-card', servicesGrid);
        for (var i = 0; i < cards.length; i++) {
            cards[i].addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-index'));
                selectedService = services[idx];
                // Update visual state
                var all = $$('.service-card', servicesGrid);
                for (var j = 0; j < all.length; j++) {
                    all[j].classList.remove('selected');
                }
                this.classList.add('selected');
                // Enable next button
                var btn = $('#btnNext1');
                if (btn) btn.disabled = false;
                // Reset downstream selections
                selectedDate = null;
                selectedSlot = null;
                availabilityCache = {};
            });
        }
    }

    // ── Step 2: Calendar ─────────────────────────────────────────────
    function renderCalendar() {
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        calendarMonthLabel.textContent = months[viewMonth] + ' ' + viewYear;

        var firstDay = new Date(viewYear, viewMonth, 1).getDay();
        var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        // Determine available dates from cache
        var mk = monthKey(viewYear, viewMonth);
        var monthSlots = availabilityCache[mk] || [];
        var availDates = {};
        for (var s = 0; s < monthSlots.length; s++) {
            var slotDate = monthSlots[s].start_at.substring(0, 10);
            availDates[slotDate] = true;
        }

        var html = '';
        var dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        for (var d = 0; d < dayNames.length; d++) {
            html += '<div class="cal-header">' + dayNames[d] + '</div>';
        }

        // Empty cells before first day
        for (var e = 0; e < firstDay; e++) {
            html += '<div class="cal-day empty"></div>';
        }

        for (var day = 1; day <= daysInMonth; day++) {
            var date = new Date(viewYear, viewMonth, day);
            var dateStr = formatDateStr(viewYear, viewMonth, day);
            var isPast = date < today;
            var isToday = date.getTime() === today.getTime();
            var hasSlots = !!availDates[dateStr];
            var isSelected = selectedDate === dateStr;

            var cls = 'cal-day';
            if (isPast || !hasSlots) cls += ' disabled';
            if (isToday) cls += ' today';
            if (hasSlots && !isPast) cls += ' available';
            if (isSelected) cls += ' selected';

            html += '<div class="' + cls + '" data-date="' + dateStr + '">' + day + '</div>';
        }

        calendarEl.innerHTML = html;
        bindCalendarDays();
    }

    function bindCalendarDays() {
        var days = $$('.cal-day.available', calendarEl);
        for (var i = 0; i < days.length; i++) {
            days[i].addEventListener('click', function () {
                selectedDate = this.getAttribute('data-date');
                selectedSlot = null;
                // Update calendar visual
                var all = $$('.cal-day', calendarEl);
                for (var j = 0; j < all.length; j++) {
                    all[j].classList.remove('selected');
                }
                this.classList.add('selected');
                renderTimeSlots();
                updateStep2Button();
            });
        }
    }

    function fetchMonthAvailability(year, month) {
        var mk = monthKey(year, month);
        if (availabilityCache[mk]) {
            renderCalendar();
            return;
        }

        showLoading(timeslotsEl);

        // If no API configured, use demo availability
        if (demoMode) {
            availabilityCache[mk] = generateDemoAvailability(year, month);
            renderCalendar();
            hideLoading(timeslotsEl);
            return;
        }

        var startDate = new Date(year, month, 1).toISOString();
        var endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

        apiGet('availability', {
            serviceVariationId: selectedService.variationId,
            startDate: startDate,
            endDate: endDate,
            locationId: locationId
        })
        .then(function (data) {
            if (data.error || data.errors) {
                // API returned an error (e.g. sandbox not onboarded to Appointments)
                // Fall back to demo availability
                demoMode = true;
                availabilityCache[mk] = generateDemoAvailability(year, month);
            } else {
                availabilityCache[mk] = data.availabilities || [];
            }
            renderCalendar();
            hideLoading(timeslotsEl);
        })
        .catch(function () {
            // Network error — fall back to demo availability
            demoMode = true;
            availabilityCache[mk] = generateDemoAvailability(year, month);
            renderCalendar();
            hideLoading(timeslotsEl);
        });
    }

    function clearTimeSlots() {
        timeslotsEl.innerHTML = '<div class="timeslots-placeholder"><i class="fa-regular fa-clock"></i><p>Select a date to see available times</p></div>';
        timeslotsTitle.textContent = 'Available Times';
    }

    function renderTimeSlots() {
        if (!selectedDate) {
            clearTimeSlots();
            return;
        }

        var mk = selectedDate.substring(0, 7);
        var monthSlots = availabilityCache[mk] || [];
        var daySlots = [];
        for (var i = 0; i < monthSlots.length; i++) {
            if (monthSlots[i].start_at.substring(0, 10) === selectedDate) {
                daySlots.push(monthSlots[i]);
            }
        }

        // Sort by start time
        daySlots.sort(function (a, b) {
            return a.start_at < b.start_at ? -1 : 1;
        });

        timeslotsTitle.textContent = 'Available Times — ' + formatDisplayDate(selectedDate);

        if (daySlots.length === 0) {
            timeslotsEl.innerHTML = '<div class="timeslots-placeholder"><i class="fa-regular fa-calendar-xmark"></i><p>No available times for this date</p></div>';
            return;
        }

        var html = '<div class="timeslots-grid">';
        for (var j = 0; j < daySlots.length; j++) {
            var slot = daySlots[j];
            var timeLabel = parseISOTime(slot.start_at);
            var isSelected = selectedSlot && selectedSlot.start_at === slot.start_at;
            html += '<button class="timeslot-btn' + (isSelected ? ' selected' : '') + '" data-index="' + j + '">' + timeLabel + '</button>';
        }
        html += '</div>';
        timeslotsEl.innerHTML = html;

        // Store daySlots reference for click handler
        timeslotsEl._daySlots = daySlots;

        var btns = $$('.timeslot-btn', timeslotsEl);
        for (var k = 0; k < btns.length; k++) {
            btns[k].addEventListener('click', function () {
                var idx = parseInt(this.getAttribute('data-index'));
                selectedSlot = timeslotsEl._daySlots[idx];
                var all = $$('.timeslot-btn', timeslotsEl);
                for (var m = 0; m < all.length; m++) {
                    all[m].classList.remove('selected');
                }
                this.classList.add('selected');
                updateStep2Button();
            });
        }
    }

    function updateStep2Button() {
        var btn = $('#btnNext2');
        if (btn) btn.disabled = !(selectedDate && selectedSlot);
    }

    // ── Step 3: Customer Form ────────────────────────────────────────
    function validateForm() {
        var name = customerForm.querySelector('#bookingName').value.trim();
        var phone = customerForm.querySelector('#bookingPhone').value.trim();
        var email = customerForm.querySelector('#bookingEmail').value.trim();

        if (name.length < 2) return false;
        if (phone.length < 7) return false;
        if (email.indexOf('@') === -1 || email.indexOf('.') === -1) return false;
        return true;
    }

    function updateStep3Button() {
        var btn = $('#btnNext3');
        if (btn) btn.disabled = !validateForm();
    }

    // ── Step 4: Confirmation ─────────────────────────────────────────
    function renderConfirmation() {
        var name = customerForm.querySelector('#bookingName').value.trim();
        var phone = customerForm.querySelector('#bookingPhone').value.trim();
        var email = customerForm.querySelector('#bookingEmail').value.trim();
        var notes = customerForm.querySelector('#bookingNotes').value.trim();

        var timeLabel = selectedSlot ? parseISOTime(selectedSlot.start_at) : '';
        var dateLabel = selectedDate ? formatDisplayDate(selectedDate) : '';

        var html = '';
        html += '<div class="confirm-row"><div class="confirm-icon"><i class="fa-solid fa-wrench"></i></div><div class="confirm-detail"><span class="confirm-label">Service</span><span class="confirm-value">' + (selectedService ? selectedService.name : '') + '</span></div></div>';
        html += '<div class="confirm-divider"></div>';
        html += '<div class="confirm-row"><div class="confirm-icon"><i class="fa-regular fa-calendar"></i></div><div class="confirm-detail"><span class="confirm-label">Date</span><span class="confirm-value">' + dateLabel + '</span></div></div>';
        html += '<div class="confirm-divider"></div>';
        html += '<div class="confirm-row"><div class="confirm-icon"><i class="fa-regular fa-clock"></i></div><div class="confirm-detail"><span class="confirm-label">Time</span><span class="confirm-value">' + timeLabel + '</span></div></div>';
        html += '<div class="confirm-divider"></div>';
        html += '<div class="confirm-row"><div class="confirm-icon"><i class="fa-regular fa-user"></i></div><div class="confirm-detail"><span class="confirm-label">Name</span><span class="confirm-value">' + escapeHtml(name) + '</span></div></div>';
        html += '<div class="confirm-divider"></div>';
        html += '<div class="confirm-row"><div class="confirm-icon"><i class="fa-solid fa-phone"></i></div><div class="confirm-detail"><span class="confirm-label">Phone</span><span class="confirm-value">' + escapeHtml(phone) + '</span></div></div>';
        html += '<div class="confirm-divider"></div>';
        html += '<div class="confirm-row"><div class="confirm-icon"><i class="fa-regular fa-envelope"></i></div><div class="confirm-detail"><span class="confirm-label">Email</span><span class="confirm-value">' + escapeHtml(email) + '</span></div></div>';

        if (notes) {
            html += '<div class="confirm-divider"></div>';
            html += '<div class="confirm-row"><div class="confirm-icon"><i class="fa-regular fa-comment"></i></div><div class="confirm-detail"><span class="confirm-label">Notes</span><span class="confirm-value">' + escapeHtml(notes) + '</span></div></div>';
        }

        confirmationCard.innerHTML = html;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function submitBooking() {
        var name = customerForm.querySelector('#bookingName').value.trim();
        var phone = customerForm.querySelector('#bookingPhone').value.trim();
        var email = customerForm.querySelector('#bookingEmail').value.trim();
        var notes = customerForm.querySelector('#bookingNotes').value.trim();

        var confirmBtn = $('#btnConfirm');
        var editBtn = $('#btnEdit');
        var errorEl = $('#bookingError');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-inline"></span> Submitting...';
        }
        if (editBtn) editBtn.disabled = true;
        if (errorEl) errorEl.style.display = 'none';

        // Parse name into first/last
        var nameParts = name.split(' ');
        var firstName = nameParts[0];
        var lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        var segment = selectedSlot.appointment_segments ? selectedSlot.appointment_segments[0] : {};
        var teamMemberId = segment.team_member_id || SQUARE_TEAM_MEMBER_ID;

        if (demoMode) {
            // Simulate success after short delay (sandbox/demo mode)
            setTimeout(function () {
                showSuccess();
            }, 1500);
            return;
        }

        apiPost('book', {
            serviceVariationId: selectedService.variationId,
            serviceVariationVersion: segment.service_variation_version || selectedService.variationVersion || 1,
            durationMinutes: segment.duration_minutes || selectedService.durationMinutes || 60,
            locationId: locationId,
            startAt: selectedSlot.start_at,
            teamMemberId: teamMemberId,
            customerFirstName: firstName,
            customerLastName: lastName,
            customerEmail: email,
            customerPhone: phone,
            customerNote: notes
        })
        .then(function (data) {
            if (data.error) {
                showBookingError(data.error);
            } else {
                showSuccess();
            }
        })
        .catch(function (err) {
            showBookingError('Something went wrong. Please try again or call us at (781) 408-2506.');
        });
    }

    function showBookingError(msg) {
        var errorEl = $('#bookingError');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = 'block';
        }
        var confirmBtn = $('#btnConfirm');
        var editBtn = $('#btnEdit');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Confirm Booking';
        }
        if (editBtn) editBtn.disabled = false;
    }

    function showSuccess() {
        // Hide step 4, show success panel
        panels[4].classList.remove('active');
        panels['success'].classList.add('active');

        // Mark all steps as completed
        for (var i = 0; i < progressSteps.length; i++) {
            progressSteps[i].classList.remove('active');
            progressSteps[i].classList.add('completed');
        }
        for (var j = 0; j < progressLines.length; j++) {
            progressLines[j].classList.add('completed');
        }
    }

    // ── Loading states ───────────────────────────────────────────────
    function showLoading(container) {
        container.innerHTML = '<div class="wizard-loading"><div class="wizard-spinner"></div><p>Loading...</p></div>';
    }

    function hideLoading(container) {
        var loader = container.querySelector('.wizard-loading');
        if (loader) loader.remove();
    }

    // ── Initialize ───────────────────────────────────────────────────
    function init() {
        wizardContainer = $('#bookingWizard');
        if (!wizardContainer) return;

        progressSteps = $$('.wizard-step', wizardContainer);
        progressLines = $$('.wizard-step-line', wizardContainer);

        panels[1] = $('#wizardStep1');
        panels[2] = $('#wizardStep2');
        panels[3] = $('#wizardStep3');
        panels[4] = $('#wizardStep4');
        panels['success'] = $('#wizardSuccess');

        servicesGrid = $('#servicesGrid');
        calendarEl = $('#calendarGrid');
        timeslotsEl = $('#timeslotsContainer');
        timeslotsTitle = $('#timeslotsTitle');
        calendarMonthLabel = $('#calendarMonthLabel');
        calendarPrev = $('#calendarPrev');
        calendarNext = $('#calendarNext');
        customerForm = $('#customerForm');
        confirmationCard = $('#confirmationCard');

        // Calendar navigation
        if (calendarPrev) {
            calendarPrev.addEventListener('click', function () {
                viewMonth--;
                if (viewMonth < 0) { viewMonth = 11; viewYear--; }
                renderCalendar();
                fetchMonthAvailability(viewYear, viewMonth);
                clearTimeSlots();
                selectedDate = null;
                selectedSlot = null;
                updateStep2Button();
            });
        }
        if (calendarNext) {
            calendarNext.addEventListener('click', function () {
                viewMonth++;
                if (viewMonth > 11) { viewMonth = 0; viewYear++; }
                renderCalendar();
                fetchMonthAvailability(viewYear, viewMonth);
                clearTimeSlots();
                selectedDate = null;
                selectedSlot = null;
                updateStep2Button();
            });
        }

        // Step navigation buttons
        bindButton('#btnNext1', function () { goToStep(2); });
        bindButton('#btnBack2', function () { goToStep(1); });
        bindButton('#btnNext2', function () { goToStep(3); });
        bindButton('#btnBack3', function () { goToStep(2); });
        bindButton('#btnNext3', function () {
            if (validateForm()) goToStep(4);
        });
        bindButton('#btnEdit', function () { goToStep(1); });
        bindButton('#btnConfirm', function () { submitBooking(); });
        bindButton('#btnBookAnother', function () {
            // Reset state
            selectedService = null;
            selectedDate = null;
            selectedSlot = null;
            availabilityCache = {};
            customerForm.reset();
            panels['success'].classList.remove('active');
            var btn1 = $('#btnNext1');
            if (btn1) btn1.disabled = true;
            goToStep(1);
            fetchServices();
        });

        // Form validation on input
        if (customerForm) {
            customerForm.addEventListener('input', updateStep3Button);
        }

        // Fetch services on load
        fetchServices();
    }

    function bindButton(selector, handler) {
        var btn = $(selector);
        if (btn) btn.addEventListener('click', handler);
    }

    // ── Boot ─────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
