/* ==================== HVAC HELP CHAT WIDGET ==================== */
/* Hardcoded decision-tree chat for Metro Boston HVAC */

(function() {
    'use strict';

    var PHONE = '(781) 408-2506';
    var PHONE_TEL = 'tel:7814082506';
    var TYPING_DELAY = 800;
    var TYPING_DELAY_LONG = 1400;
    var AUTO_OPEN_DELAY = 10000;
    var LS_KEY_STATE = 'mbhvac_chat_state';
    var LS_KEY_ANALYTICS = 'mbhvac_chat_analytics';
    var RETURN_VISITOR_DAYS = 7;

    var chatData = null;
    var chatWindow = null;
    var chatMessages = null;
    var chatToggle = null;
    var chatUnread = null;
    var chatTooltip = null;
    var isOpen = false;

    // ── Load Conversation Data ──
    function loadChatData(callback) {
        var script = document.currentScript || (function() {
            var scripts = document.getElementsByTagName('script');
            return scripts[scripts.length - 1];
        })();
        var basePath = '';
        if (script && script.src) {
            basePath = script.src.substring(0, script.src.lastIndexOf('/') + 1);
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', basePath + 'chat-data.json', true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        chatData = JSON.parse(xhr.responseText);
                        callback();
                    } catch(e) {
                        console.warn('Chat widget: Failed to parse chat data');
                    }
                } else {
                    console.warn('Chat widget: Could not load chat-data.json');
                }
            }
        };
        xhr.send();
    }

    // ── Time & Season Context ──
    function getTimeContext() {
        var now = new Date();
        var hour = now.getHours();
        var day = now.getDay();
        var month = now.getMonth();

        var isOffHours = false;
        var timeLabel = '';

        if (hour >= 21 || hour < 6) {
            timeLabel = 'late';
            isOffHours = true;
        } else if (hour >= 18) {
            timeLabel = 'evening';
            isOffHours = true;
        } else if (hour < 8) {
            timeLabel = 'early morning';
            isOffHours = true;
        }
        if (day === 0 || day === 6) isOffHours = true;

        var season = 'general';
        if (month >= 5 && month <= 8) season = 'summer';
        else if (month >= 10 || month <= 2) season = 'winter';

        return { hour: hour, day: day, timeLabel: timeLabel, isOffHours: isOffHours, season: season };
    }

    function getTimeBannerText() {
        var ctx = getTimeContext();
        if (!ctx.isOffHours) return '';
        if (ctx.timeLabel === 'late') return "It's late, but our emergency technicians are standing by right now.";
        if (ctx.timeLabel === 'evening') return "Even though it's evening, our team is still available for emergencies.";
        if (ctx.timeLabel === 'early morning') return "Early morning? No worries — our team is available 24/7.";
        if (ctx.day === 0) return "Yes, we're available on Sundays! Our team is here when you need us.";
        if (ctx.day === 6) return "Weekend? We're still here. Our technicians are available today.";
        return '';
    }

    // ── Analytics ──
    function trackPath(nodeId) {
        try {
            var data = JSON.parse(localStorage.getItem(LS_KEY_ANALYTICS) || '{}');
            data[nodeId] = (data[nodeId] || 0) + 1;
            data._total = (data._total || 0) + 1;
            localStorage.setItem(LS_KEY_ANALYTICS, JSON.stringify(data));
        } catch(e) {}
    }

    // ── State Persistence ──
    function saveState(key, value) {
        try {
            var data = JSON.parse(localStorage.getItem(LS_KEY_STATE) || '{}');
            data[key] = value;
            localStorage.setItem(LS_KEY_STATE, JSON.stringify(data));
        } catch(e) {}
    }

    function getState(key) {
        try {
            var data = JSON.parse(localStorage.getItem(LS_KEY_STATE) || '{}');
            return data[key];
        } catch(e) { return undefined; }
    }

    // ── Return Visitor Detection ──
    function getReturnVisitorContext() {
        var lastVisit = getState('lastVisitPath');
        var lastTimestamp = getState('lastVisitTimestamp');
        if (!lastVisit || !lastTimestamp) return null;

        var daysSince = (Date.now() - lastTimestamp) / (1000 * 60 * 60 * 24);
        if (daysSince > RETURN_VISITOR_DAYS) return null;

        return { path: lastVisit, daysSince: daysSince };
    }

    function saveVisitPath(path) {
        saveState('lastVisitPath', path);
        saveState('lastVisitTimestamp', Date.now());
    }

    // ── Build Widget HTML ──
    function buildWidget() {
        var container = document.createElement('div');
        container.id = 'chatWidgetRoot';

        container.innerHTML =
            '<button class="chat-toggle" id="chatToggle" aria-label="Open chat">' +
                '<span class="chat-unread" id="chatUnread">1</span>' +
                '<span class="chat-tooltip" id="chatTooltip">Need help? Chat with us</span>' +
                '<svg class="chat-icon-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
                '</svg>' +
                '<svg class="chat-icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<line x1="18" y1="6" x2="6" y2="18"/>' +
                    '<line x1="6" y1="6" x2="18" y2="18"/>' +
                '</svg>' +
            '</button>' +
            '<div class="chat-window" id="chatWindow">' +
                '<div class="chat-header">' +
                    '<div class="chat-header-avatar">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' +
                        '</svg>' +
                    '</div>' +
                    '<div class="chat-header-info">' +
                        '<div class="chat-header-title">HVAC HELP CENTER</div>' +
                        '<div class="chat-header-status">' +
                            '<span class="chat-header-status-dot"></span>' +
                            'We\'re online' +
                        '</div>' +
                    '</div>' +
                    '<div class="chat-header-actions">' +
                        '<button id="chatMinimize" aria-label="Minimize chat">' +
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="18" x2="18" y2="6"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
                            '<span class="chat-minimize-label">Close</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="chat-messages" id="chatMessages"></div>' +
                '<div class="chat-footer">' +
                    '<button class="chat-footer-start-over" id="chatStartOver">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                            '<polyline points="1 4 1 10 7 10"/>' +
                            '<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>' +
                        '</svg>' +
                        'Start over' +
                    '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(container);
        document.body.classList.add('chat-widget-loaded');

        chatToggle = document.getElementById('chatToggle');
        chatWindow = document.getElementById('chatWindow');
        chatMessages = document.getElementById('chatMessages');
        chatUnread = document.getElementById('chatUnread');
        chatTooltip = document.getElementById('chatTooltip');
    }

    // ── Message Rendering ──
    function addBotMessage(text) {
        var msg = document.createElement('div');
        msg.className = 'chat-msg bot';
        msg.innerHTML = '<div class="chat-msg-bubble">' + escapeHTML(text) + '</div>';
        chatMessages.appendChild(msg);
        scrollToBottom();
    }

    function addUserMessage(text) {
        var msg = document.createElement('div');
        msg.className = 'chat-msg user';
        msg.innerHTML = '<div class="chat-msg-bubble">' + escapeHTML(text) + '</div>';
        chatMessages.appendChild(msg);
        scrollToBottom();
    }

    function addTimeBanner() {
        var text = getTimeBannerText();
        if (!text) return;
        var banner = document.createElement('div');
        banner.className = 'chat-time-banner';
        banner.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
            escapeHTML(text);
        chatMessages.appendChild(banner);
        scrollToBottom();
    }

    function addSafetyTip(text, isInfo) {
        var el = document.createElement('div');
        el.className = 'chat-safety-tip' + (isInfo ? ' info' : '');
        var iconSvg = isInfo
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
        el.innerHTML = iconSvg + '<span>' + escapeHTML(text) + '</span>';
        chatMessages.appendChild(el);
        scrollToBottom();
    }

    function showTyping() {
        var el = document.createElement('div');
        el.className = 'chat-typing';
        el.id = 'chatTypingIndicator';
        el.innerHTML = '<span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>';
        chatMessages.appendChild(el);
        scrollToBottom();
    }

    function hideTyping() {
        var el = document.getElementById('chatTypingIndicator');
        if (el) el.remove();
    }

    function addPhoneCTA() {
        var el = document.createElement('a');
        el.className = 'chat-phone-cta';
        el.href = PHONE_TEL;
        el.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
                '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>' +
            '</svg>' +
            'Call ' + PHONE + ' — Available 24/7';
        chatMessages.appendChild(el);
        scrollToBottom();
    }

    function addLinkCTA(label, url) {
        var el = document.createElement('a');
        el.className = 'chat-link-cta';
        el.href = url;
        el.innerHTML = escapeHTML(label) +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
        chatMessages.appendChild(el);
        scrollToBottom();
    }

    function addOptions(options) {
        var container = document.createElement('div');
        container.className = 'chat-options';
        options.forEach(function(opt) {
            var btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.textContent = opt.label;
            btn.addEventListener('click', function() {
                handleOptionClick(opt);
            });
            container.appendChild(btn);
        });
        chatMessages.appendChild(container);
        scrollToBottom();
    }

    // ── Multi-Select Symptoms ──
    function addMultiSelect(symptomKeys) {
        var symptomData = chatData.symptom_data;
        var container = document.createElement('div');
        container.className = 'chat-multi-select';

        var selected = {};

        symptomKeys.forEach(function(key) {
            var data = symptomData[key];
            if (!data) return;

            var btn = document.createElement('button');
            btn.className = 'chat-multi-option';
            btn.innerHTML =
                '<span class="chat-multi-check">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' +
                '</span>' +
                escapeHTML(data.label);

            btn.addEventListener('click', function() {
                if (selected[key]) {
                    delete selected[key];
                    btn.classList.remove('selected');
                } else {
                    selected[key] = true;
                    btn.classList.add('selected');
                }
                var count = Object.keys(selected).length;
                continueBtn.className = 'chat-multi-continue' + (count > 0 ? ' enabled' : '');
                continueBtn.textContent = count > 0
                    ? 'Continue with ' + count + ' issue' + (count > 1 ? 's' : '') + ' selected'
                    : 'Select at least one issue';
            });

            container.appendChild(btn);
        });

        chatMessages.appendChild(container);

        // Continue button
        var continueBtn = document.createElement('button');
        continueBtn.className = 'chat-multi-continue';
        continueBtn.textContent = 'Select at least one issue';
        continueBtn.addEventListener('click', function() {
            var keys = Object.keys(selected);
            if (keys.length === 0) return;

            // Disable the multi-select
            container.querySelectorAll('.chat-multi-option').forEach(function(b) {
                b.style.pointerEvents = 'none';
                b.style.opacity = '0.6';
            });
            continueBtn.style.pointerEvents = 'none';
            continueBtn.style.opacity = '0.5';

            // Show user's selection as message
            var labels = keys.map(function(k) { return symptomData[k].label; });
            addUserMessage(labels.join(', '));

            // Track
            keys.forEach(function(k) { trackPath('symptom_' + k); });
            saveVisitPath('emergency');

            // Process symptoms
            processSymptoms(keys);
        });
        chatMessages.appendChild(continueBtn);
        scrollToBottom();
    }

    // ── Process Multi-Selected Symptoms ──
    function processSymptoms(keys) {
        var safetyTips = chatData.safety_tips;
        var ctx = getTimeContext();
        var count = keys.length;

        showTyping();
        setTimeout(function() {
            hideTyping();

            // One short consolidated response — no per-symptom diagnosis
            addBotMessage("Thanks for letting us know. Before calling, a couple quick things worth checking: make sure your thermostat is set correctly, check your air filter (a dirty filter causes more issues than you'd think), and take a look at your breaker panel for anything tripped. Beyond that, this is something a technician should look at in person.");

            // Only surface critical safety warnings
            var safetyDelay = 400;
            if (keys.indexOf('bad_smell') !== -1) {
                setTimeout(function() {
                    addSafetyTip(safetyTips.gas_smell);
                }, safetyDelay);
                safetyDelay += 300;
            }
            if (keys.indexOf('leaking') !== -1) {
                setTimeout(function() {
                    addSafetyTip(safetyTips.water_damage);
                }, safetyDelay);
                safetyDelay += 300;
            }

            // Move to urgency assessment
            setTimeout(function() {
                showSafetyAndUrgency(keys, count);
            }, safetyDelay + 200);
        }, TYPING_DELAY);
    }

    // ── Urgency Assessment ──
    function showSafetyAndUrgency(keys, count) {
        var ctx = getTimeContext();

        // Auto-urgent: 3+ symptoms, gas smell, or dangerous combos
        var autoUrgent = count >= 3 ||
            (keys.indexOf('bad_smell') !== -1) ||
            (keys.indexOf('wont_start') !== -1 && (keys.indexOf('strange_noise') !== -1 || keys.indexOf('leaking') !== -1));

        if (autoUrgent) {
            showTyping();
            setTimeout(function() {
                hideTyping();
                addBotMessage("Based on what you're describing, I'd recommend having a technician take a look as soon as possible. We're available 24/7.");

                setTimeout(function() { addPhoneCTA(); }, 300);

                setTimeout(function() {
                    addOptions([
                        { label: "What should I expect during the visit?", next: "what_to_expect" },
                        { label: "How old is my system — does it matter?", next: "system_age" },
                        { label: "Start over", next: "welcome", restart: true }
                    ]);
                }, 500);
            }, TYPING_DELAY);
        } else {
            showTyping();
            setTimeout(function() {
                hideTyping();
                addBotMessage("Would you like us to send someone out, or are you okay for now?");
                addOptions([
                    { label: "I'd like to schedule a visit", next: "_urgent_yes" },
                    { label: "I'm okay for now", next: "_urgent_no" },
                    { label: "Already tried the basics — still not working", next: "_urgent_yes" }
                ]);
            }, TYPING_DELAY);
        }
    }

    // ── Core Chat Logic ──
    function handleOptionClick(opt) {
        // Disable all option buttons
        chatMessages.querySelectorAll('.chat-options').forEach(function(group) {
            group.querySelectorAll('.chat-option-btn').forEach(function(b) {
                b.disabled = true;
                b.style.opacity = '0.5';
                b.style.cursor = 'default';
                b.style.pointerEvents = 'none';
            });
        });

        addUserMessage(opt.label);
        trackPath(opt.next);

        // Handle special internal routes
        if (opt.next === '_urgent_yes') {
            handleUrgentYes();
            return;
        }
        if (opt.next === '_urgent_no') {
            handleUrgentNo();
            return;
        }

        if (opt.restart) {
            setTimeout(function() { startConversation(); }, 600);
        } else {
            // Save visit path for return visitor detection
            if (['emergency', 'maintenance', 'quote', 'general'].indexOf(opt.next) !== -1) {
                saveVisitPath(opt.next);
            }
            renderNode(opt.next);
        }
    }

    function handleUrgentYes() {
        showTyping();
        setTimeout(function() {
            hideTyping();
            addBotMessage("We'll get someone out to you. Give us a call and we can usually have a technician there within the hour.");

            setTimeout(function() { addPhoneCTA(); }, 300);

            setTimeout(function() {
                addOptions([
                    { label: "What will the visit cost?", next: "faq_emergency_pricing" },
                    { label: "What should I expect?", next: "what_to_expect" },
                    { label: "Start over", next: "welcome", restart: true }
                ]);
            }, 500);
        }, TYPING_DELAY);
    }

    function handleUrgentNo() {
        showTyping();
        setTimeout(function() {
            hideTyping();
            addBotMessage("No problem. When you're ready, give us a call or reach out online. We're here 24/7.");

            setTimeout(function() { addPhoneCTA(); }, 300);
            setTimeout(function() { addLinkCTA('Contact Us Online', 'contact.html'); }, 500);
            setTimeout(function() {
                addOptions([
                    { label: "Do you have any specials?", next: "offers_plug" },
                    { label: "Start over", next: "welcome", restart: true }
                ]);
            }, 700);
        }, TYPING_DELAY);
    }

    function renderNode(nodeId) {
        var node = chatData[nodeId];
        if (!node) node = chatData['fallback'];

        var messages = node.messages || [];
        var delay = 0;

        showTyping();
        delay += messages.length > 1 ? TYPING_DELAY_LONG : TYPING_DELAY;

        messages.forEach(function(msg, i) {
            setTimeout(function() {
                hideTyping();
                addBotMessage(msg);

                if (i === messages.length - 1) {
                    // After last message, show appropriate UI
                    var ctaDelay = 300;

                    // Multi-select node
                    if (node.type === 'multi_select' && node.symptom_keys) {
                        setTimeout(function() {
                            addMultiSelect(node.symptom_keys);
                        }, ctaDelay);
                        return;
                    }

                    if (node.phone_cta) {
                        setTimeout(function() { addPhoneCTA(); }, ctaDelay);
                        ctaDelay += 200;
                    }
                    if (node.link_cta) {
                        setTimeout(function() { addLinkCTA(node.link_cta.label, node.link_cta.url); }, ctaDelay);
                        ctaDelay += 200;
                    }
                    if (node.options && node.options.length > 0) {
                        setTimeout(function() { addOptions(node.options); }, ctaDelay);
                    }
                } else {
                    showTyping();
                }
            }, delay);
            delay += TYPING_DELAY;
        });
    }

    // ── Pick Random Variant ──
    function pickVariant(node) {
        if (node.messages_variants && node.messages_variants.length > 0) {
            var idx = Math.floor(Math.random() * node.messages_variants.length);
            return node.messages_variants[idx];
        }
        return node.messages || [];
    }

    // ── Conversation Start ──
    function startConversation() {
        chatMessages.innerHTML = '';
        addTimeBanner();

        var returnCtx = getReturnVisitorContext();
        var ctx = getTimeContext();

        // Return visitor who was on emergency path
        if (returnCtx && returnCtx.path === 'emergency' && chatData['return_welcome_emergency']) {
            renderNode('return_welcome_emergency');
            return;
        }

        // Seasonal welcome
        var welcomeNode = 'welcome';
        if (ctx.season === 'winter' && chatData['welcome_winter']) {
            welcomeNode = 'welcome_winter';
        } else if (ctx.season === 'summer' && chatData['welcome_summer']) {
            welcomeNode = 'welcome_summer';
        }

        var seasonalNode = chatData[welcomeNode];
        var welcomeOptions = chatData['welcome'].options;
        var messages = pickVariant(seasonalNode);
        if (messages.length === 0) messages = pickVariant(chatData['welcome']);

        var delay = 0;
        showTyping();
        delay += TYPING_DELAY;

        messages.forEach(function(msg, i) {
            setTimeout(function() {
                hideTyping();
                addBotMessage(msg);
                if (i === messages.length - 1) {
                    setTimeout(function() { addOptions(welcomeOptions); }, 300);
                } else {
                    showTyping();
                }
            }, delay);
            delay += TYPING_DELAY;
        });
    }

    // ── Open / Close ──
    function openChat() {
        isOpen = true;
        chatWindow.classList.add('open');
        chatToggle.classList.add('active');
        chatUnread.classList.remove('visible');
        chatTooltip.classList.remove('visible');
        saveState('minimized', false);
        saveState('hasOpened', true);

        if (chatMessages.children.length === 0) {
            startConversation();
        }
        scrollToBottom();
    }

    function closeChat() {
        isOpen = false;
        chatWindow.classList.remove('open');
        chatToggle.classList.remove('active');
        saveState('minimized', true);
    }

    // ── Utility ──
    function scrollToBottom() {
        setTimeout(function() {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    }

    function escapeHTML(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Initialize ──
    function init() {
        buildWidget();

        chatToggle.addEventListener('click', function() {
            if (isOpen) closeChat();
            else openChat();
        });

        document.getElementById('chatMinimize').addEventListener('click', closeChat);

        document.getElementById('chatStartOver').addEventListener('click', function() {
            startConversation();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isOpen) closeChat();
        });

        // Auto-open logic
        var wasMinimized = getState('minimized');
        var hasOpened = getState('hasOpened');

        if (wasMinimized) {
            setTimeout(function() { chatUnread.classList.add('visible'); }, 2000);
        } else if (!hasOpened) {
            setTimeout(function() { chatTooltip.classList.add('visible'); }, 3000);
            setTimeout(function() {
                chatTooltip.classList.remove('visible');
                if (!isOpen) openChat();
            }, AUTO_OPEN_DELAY);
        }
    }

    // ── Start ──
    function boot() {
        loadChatData(function() {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }
        });
    }

    boot();
})();
