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

    var chatData = null;
    var chatWindow = null;
    var chatMessages = null;
    var chatToggle = null;
    var chatUnread = null;
    var chatTooltip = null;
    var isOpen = false;
    var hasAutoOpened = false;

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

    // ── Time Awareness ──
    function getTimeContext() {
        var now = new Date();
        var hour = now.getHours();
        var day = now.getDay();
        var month = now.getMonth();

        var timeLabel = '';
        var isOffHours = false;

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

        if (day === 0 || day === 6) {
            isOffHours = true;
        }

        var season = 'general';
        if (month >= 5 && month <= 8) season = 'summer';
        else if (month >= 10 || month <= 2) season = 'winter';

        return { hour: hour, day: day, timeLabel: timeLabel, isOffHours: isOffHours, season: season };
    }

    function getTimeBannerText() {
        var ctx = getTimeContext();
        if (!ctx.isOffHours) return '';

        var day = ctx.day;
        if (ctx.timeLabel === 'late') {
            return "It's late, but our emergency technicians are standing by right now.";
        } else if (ctx.timeLabel === 'evening') {
            return "Even though it's evening, our team is still available for emergencies.";
        } else if (ctx.timeLabel === 'early morning') {
            return "Early morning? No worries — our team is available 24/7.";
        } else if (day === 0) {
            return "Yes, we're available on Sundays! Our team is here if you need us.";
        } else if (day === 6) {
            return "Weekend? We're still here. Our technicians are available today.";
        }
        return '';
    }

    // ── Analytics (simple localStorage counters) ──
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
                            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
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

    // ── Core Chat Logic ──
    function handleOptionClick(opt) {
        // Disable all option buttons
        var allBtns = chatMessages.querySelectorAll('.chat-options');
        allBtns.forEach(function(group) {
            group.querySelectorAll('.chat-option-btn').forEach(function(b) {
                b.disabled = true;
                b.style.opacity = '0.5';
                b.style.cursor = 'default';
                b.style.pointerEvents = 'none';
            });
        });

        // Show user's choice
        addUserMessage(opt.label);

        // Track analytics
        trackPath(opt.next);

        // Navigate to next node
        if (opt.restart) {
            setTimeout(function() {
                startConversation();
            }, 600);
        } else {
            renderNode(opt.next);
        }
    }

    function renderNode(nodeId) {
        var node = chatData[nodeId];
        if (!node) {
            node = chatData['fallback'];
        }

        var messages = node.messages || [];
        var delay = 0;

        // Show typing, then messages sequentially
        showTyping();
        delay += messages.length > 1 ? TYPING_DELAY_LONG : TYPING_DELAY;

        messages.forEach(function(msg, i) {
            setTimeout(function() {
                hideTyping();
                addBotMessage(msg);

                // After last message, show CTAs and options
                if (i === messages.length - 1) {
                    var ctaDelay = 300;

                    if (node.phone_cta) {
                        setTimeout(function() {
                            addPhoneCTA();
                        }, ctaDelay);
                        ctaDelay += 200;
                    }

                    if (node.link_cta) {
                        setTimeout(function() {
                            addLinkCTA(node.link_cta.label, node.link_cta.url);
                        }, ctaDelay);
                        ctaDelay += 200;
                    }

                    if (node.options && node.options.length > 0) {
                        setTimeout(function() {
                            addOptions(node.options);
                        }, ctaDelay);
                    }
                } else {
                    // More messages coming — show typing again
                    showTyping();
                }
            }, delay);

            delay += TYPING_DELAY;
        });
    }

    function startConversation() {
        chatMessages.innerHTML = '';

        // Time-awareness banner
        addTimeBanner();

        // Render welcome node
        renderNode('welcome');
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

        // Start conversation if empty
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

        // Toggle button
        chatToggle.addEventListener('click', function() {
            if (isOpen) {
                closeChat();
            } else {
                openChat();
            }
        });

        // Minimize button
        document.getElementById('chatMinimize').addEventListener('click', function() {
            closeChat();
        });

        // Start over button
        document.getElementById('chatStartOver').addEventListener('click', function() {
            startConversation();
        });

        // ESC to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isOpen) {
                closeChat();
            }
        });

        // Auto-open logic
        var wasMinimized = getState('minimized');
        var hasOpened = getState('hasOpened');

        if (wasMinimized) {
            // User explicitly closed it before — show unread badge
            setTimeout(function() {
                chatUnread.classList.add('visible');
            }, 2000);
        } else if (!hasOpened) {
            // First visit — show tooltip, then auto-open
            setTimeout(function() {
                chatTooltip.classList.add('visible');
            }, 3000);

            setTimeout(function() {
                chatTooltip.classList.remove('visible');
                if (!isOpen) {
                    openChat();
                    hasAutoOpened = true;
                }
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
