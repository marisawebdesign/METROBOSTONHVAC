// Mobile accordion
document.querySelectorAll('.mobile-accordion-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
        this.parentElement.classList.toggle('open');
    });
});

// Vertical review carousel
(function() {
    var track = document.getElementById('reviewTrack');
    var viewport = document.getElementById('reviewViewport');
    var upBtn = document.getElementById('reviewUp');
    var downBtn = document.getElementById('reviewDown');
    var dotsContainer = document.getElementById('reviewDots');
    if (!track || !viewport) return;

    var cards = Array.prototype.slice.call(track.querySelectorAll('.review-card'));
    var total = cards.length;
    var current = 0;
    var isTransitioning = false;

    function getCardHeight(index) {
        var card = track.children[index];
        if (!card) return 0;
        var style = window.getComputedStyle(card);
        return card.offsetHeight + parseInt(style.marginBottom || 0);
    }

    function updateViewportHeight() {
        var cardIdx = current;
        var trackCards = track.children;
        var mainCard = trackCards[cardIdx + total];
        if (!mainCard) mainCard = trackCards[cardIdx];
        var mainHeight = mainCard.offsetHeight;
        viewport.style.height = (mainHeight + 76) + 'px';
    }

    function setupInfiniteLoop() {
        for (var i = total - 1; i >= 0; i--) {
            var clone = cards[i].cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            clone.classList.add('review-card-clone');
            track.insertBefore(clone, track.firstChild);
        }
        for (var j = 0; j < total; j++) {
            var clone2 = cards[j].cloneNode(true);
            clone2.setAttribute('aria-hidden', 'true');
            clone2.classList.add('review-card-clone');
            track.appendChild(clone2);
        }
    }

    function getOffset(index) {
        var actualIndex = index + total;
        var offset = 0;
        var trackCards = track.children;
        for (var i = 0; i < actualIndex; i++) {
            var card = trackCards[i];
            var style = window.getComputedStyle(card);
            offset += card.offsetHeight + parseInt(style.marginBottom || 0);
        }
        return offset;
    }

    function goTo(index, animate) {
        if (isTransitioning && animate !== false) return;

        current = index;
        var offset = getOffset(current);

        if (animate === false) {
            track.style.transition = 'none';
        } else {
            track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
            isTransitioning = true;
        }

        track.style.transform = 'translateY(-' + offset + 'px)';
        updateViewportHeight();
        updateDots();

        if (animate === false) {
            track.offsetHeight;
            track.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1)';
        }
    }

    function onTransitionEnd() {
        isTransitioning = false;
        if (current >= total) {
            current = current - total;
            goTo(current, false);
        } else if (current < 0) {
            current = current + total;
            goTo(current, false);
        }
    }

    track.addEventListener('transitionend', onTransitionEnd);

    function buildDots() {
        dotsContainer.innerHTML = '';
        for (var i = 0; i < total; i++) {
            var dot = document.createElement('button');
            dot.className = 'review-carousel-dot' + (i === current ? ' active' : '');
            dot.setAttribute('aria-label', 'Go to review ' + (i + 1));
            dot.addEventListener('click', (function(idx) {
                return function() { goTo(idx, true); };
            })(i));
            dotsContainer.appendChild(dot);
        }
    }

    function updateDots() {
        var normalizedIndex = ((current % total) + total) % total;
        var dots = dotsContainer.querySelectorAll('.review-carousel-dot');
        for (var i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('active', i === normalizedIndex);
        }
    }

    upBtn.addEventListener('click', function() {
        goTo(current - 1, true);
    });

    downBtn.addEventListener('click', function() {
        goTo(current + 1, true);
    });

    var wrapper = document.getElementById('reviewCarousel');
    wrapper.setAttribute('tabindex', '0');
    wrapper.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowUp') {
            goTo(current - 1, true);
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            goTo(current + 1, true);
            e.preventDefault();
        }
    });

    var startY = 0;
    var touchMoving = false;
    viewport.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
        touchMoving = true;
    }, { passive: true });
    viewport.addEventListener('touchend', function(e) {
        if (!touchMoving) return;
        var diff = startY - e.changedTouches[0].clientY;
        if (Math.abs(diff) > 40) {
            goTo(diff > 0 ? current + 1 : current - 1, true);
        }
        touchMoving = false;
    }, { passive: true });

    setupInfiniteLoop();
    buildDots();
    goTo(0, false);

    var resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            goTo(current, false);
        }, 200);
    });
})();
