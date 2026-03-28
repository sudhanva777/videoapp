/* ═══════════════════════════════════════════════════════════
   YOUTUBE LIVE SIMULATION — ENGINE
   Zero frameworks. Zero dependencies. Pure vanilla JS.
   ═══════════════════════════════════════════════════════════ */

// ── 0. VIDEO AUTOPLAY ENGINE (runs FIRST, before anything else) ──
// Fixes: stall loop, premature unmute, no GPU accel, no freeze detection
(function () {
  var startVideo = function () {
    var video = document.getElementById('stream-video');
    if (!video) return;

    // Guarantee muted state (required for autoplay in all browsers)
    video.muted = true;
    video.volume = 0;
    video.preload = 'auto';

    // ── UNMUTE: wait for canplaythrough, ramp volume smoothly ──
    var hasUnmuted = false;
    var doUnmute = function () {
      if (hasUnmuted) return;
      hasUnmuted = true;
      video.muted = false;
      // Ramp volume 0 → 1 over ~800ms (feels like joining mid-stream)
      var vol = 0;
      var ramp = setInterval(function () {
        vol = Math.min(1, vol + 0.08);
        video.volume = vol;
        if (vol >= 1) clearInterval(ramp);
      }, 80);
    };

    // ── PLAY: force autoplay, schedule unmute properly ──
    video.play().then(function () {
      // If buffer is already full, unmute quickly
      if (video.readyState >= 4) {
        setTimeout(doUnmute, 1200);
      } else {
        // Wait for buffer to be healthy, THEN unmute
        video.addEventListener('canplaythrough', function () {
          setTimeout(doUnmute, 800);
        }, { once: true });
        // Fallback: if canplaythrough never fires, unmute after 4s anyway
        setTimeout(doUnmute, 4000);
      }
    }).catch(function () {
      // Browser blocked autoplay — unmute on first user interaction
      var unlock = function () {
        video.muted = false;
        video.volume = 1;
        hasUnmuted = true;
        video.play().catch(function () {});
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('click', unlock);
      document.addEventListener('touchstart', unlock);
      document.addEventListener('keydown', unlock);
    });

    // ── STALL RECOVERY: just nudge play(), never call load() ──
    video.addEventListener('stalled', function () {
      setTimeout(function () { video.play().catch(function () {}); }, 300);
    });

    video.addEventListener('waiting', function () {
      setTimeout(function () { video.play().catch(function () {}); }, 300);
    });

    // ── ERROR RECOVERY: only load() on fatal decode/source errors ──
    video.addEventListener('error', function () {
      var err = video.error;
      if (err && (err.code === 3 || err.code === 4)) {
        // MEDIA_ERR_DECODE or MEDIA_ERR_SRC_NOT_SUPPORTED — must reload
        setTimeout(function () {
          var t = video.currentTime;
          video.load();
          video.currentTime = t;
          video.play().catch(function () {});
        }, 1500);
      }
      // For other errors (network etc) — do nothing, stall handler covers it
    });

    // ── FREEZE DETECTION: monitor currentTime every 3s ──
    var lastTime = -1;
    var stallCount = 0;
    setInterval(function () {
      if (!video.paused && !video.ended && video.readyState >= 2) {
        if (video.currentTime === lastTime) {
          stallCount++;
          if (stallCount >= 2) {
            // Stuck for 6+ seconds — nudge forward
            video.currentTime += 0.1;
            video.play().catch(function () {});
            stallCount = 0;
          }
        } else {
          stallCount = 0;
        }
        lastTime = video.currentTime;
      }
    }, 3000);
  };

  // Run as soon as DOM is ready (or immediately if already ready)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startVideo);
  } else {
    startVideo();
  }
})();

// ── 0.5 LOADING OVERLAY (independent, runs on DOMContentLoaded) ──
setTimeout(function () {
  var overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.transition = 'opacity 0.8s ease';
    overlay.style.opacity = '0';
    setTimeout(function () {
      overlay.style.display = 'none';
    }, 800);
  }
}, 2500);


// ── MAIN ENGINE (chat, viewers, timers) ──────────────────────────
(function () {
  'use strict';

  // ── DOM REFS ─────────────────────────────────────────────
  var $ = function (sel) { return document.querySelector(sel); };
  var viewerNumEl    = $('#viewer-num');
  var viewerChipEl   = $('.overlay-viewers');
  var metaViewersEl  = $('#meta-viewers');
  var overlayClock   = $('#overlay-clock');
  var durationEl     = $('#stream-duration');
  var likeBtnEl      = $('#like-btn');
  var likeCountEl    = $('#like-count');
  var chatBox        = $('#chat-messages');

  // ── INTERVALS REGISTRY (cleanup on unload) ──────────────
  var intervals = [];
  var timeouts  = [];

  function safeInterval(fn, ms) {
    var id = setInterval(fn, ms);
    intervals.push(id);
    return id;
  }

  function safeTimeout(fn, ms) {
    var id = setTimeout(fn, ms);
    timeouts.push(id);
    return id;
  }

  window.addEventListener('beforeunload', function () {
    intervals.forEach(clearInterval);
    timeouts.forEach(clearTimeout);
  });

  // ── 1. VIEWER COUNT ENGINE ──────────────────────────────
  var streamStart = Date.now();
  var viewerCount = 100 + Math.floor(Math.random() * 200); // 100–300

  function formatNum(n) {
    return n.toLocaleString('en-US');
  }

  function updateViewerDisplay() {
    viewerNumEl.textContent = formatNum(viewerCount);
    metaViewersEl.textContent = formatNum(viewerCount) + ' watching';
    // Flash effect
    viewerChipEl.classList.add('flash');
    safeTimeout(function () { viewerChipEl.classList.remove('flash'); }, 280);
  }

  updateViewerDisplay();

  function tickViewers() {
    var elapsedSec = (Date.now() - streamStart) / 1000;
    var delta;

    if (elapsedSec < 60) {
      // Phase 1: rapid growth 100 → ~1000
      delta = Math.floor(Math.random() * 28) + 8;
    } else if (viewerCount < 10000) {
      // Phase 2: steady growth toward 10K
      delta = Math.floor(Math.random() * 18) + 3;
    } else {
      // Phase 3: fluctuation around current level
      delta = Math.floor(Math.random() * 50) - 18;
    }

    viewerCount = Math.max(50, viewerCount + delta);
    updateViewerDisplay();

    var next = 2000 + Math.random() * 1500;
    safeTimeout(tickViewers, next);
  }

  safeTimeout(tickViewers, 2800);

  // Occasional viewer spike (every 40–60s)
  function scheduleSpike() {
    var wait = 40000 + Math.random() * 20000;
    safeTimeout(function () {
      var spike = Math.floor(Math.random() * 180) + 60;
      viewerCount = Math.max(50, viewerCount + spike);
      updateViewerDisplay();
      burstChat(3 + Math.floor(Math.random() * 3));
      scheduleSpike();
    }, wait);
  }
  scheduleSpike();

  // ── 2. TIMERS ──────────────────────────────────────────
  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatDuration(totalSec) {
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    if (h > 0) return h + ':' + pad2(m) + ':' + pad2(s);
    return m + ':' + pad2(s);
  }

  function getCurrentHMS() {
    var now = new Date();
    return pad2(now.getHours()) + ':' + pad2(now.getMinutes()) + ':' + pad2(now.getSeconds());
  }

  safeInterval(function () {
    var elapsed = Math.floor((Date.now() - streamStart) / 1000);
    overlayClock.textContent = getCurrentHMS();
    durationEl.textContent = 'Started ' + formatDuration(elapsed) + ' ago';
  }, 1000);

  overlayClock.textContent = getCurrentHMS();

  // ── 3. LIKE COUNT ──────────────────────────────────────
  var likeCount = 847 + Math.floor(Math.random() * 400);
  likeCountEl.textContent = formatNum(likeCount);

  safeInterval(function () {
    likeCount += 1 + Math.floor(Math.random() * 5);
    likeCountEl.textContent = formatNum(likeCount);
  }, 8500);

  // ── 4. CHAT ENGINE ─────────────────────────────────────
  var USERS = [
    { name: 'Ravi_Codes',       color: '#4fc3f7', badge: 'mod'    },
    { name: 'priya.learns',     color: '#81c784', badge: 'member' },
    { name: 'TechWithAkash',    color: '#ffb74d', badge: null     },
    { name: 'curiosity_404',    color: '#f06292', badge: null     },
    { name: 'learner_dev',      color: '#ce93d8', badge: 'member' },
    { name: 'Mumbai_vibes',     color: '#80cbc4', badge: null     },
    { name: 'just_watching_99', color: '#fff176', badge: null     },
    { name: 'deepak.sharma',    color: '#ff8a65', badge: null     },
    { name: 'shruti_tech',      color: '#90caf9', badge: null     },
    { name: 'anon_dev',         color: '#b0bec5', badge: null     },
    { name: 'code_monk',        color: '#a5d6a7', badge: null     },
    { name: 'pixel_queen',      color: '#ef9a9a', badge: null     },
    { name: 'night_coder_42',   color: '#b39ddb', badge: null     },
    { name: 'sahil.tsx',        color: '#80deea', badge: null     },
    { name: 'arjun_builds',     color: '#ffe082', badge: null     }
  ];

  var MESSAGES = [
    'this is insane \u{1f525}',
    'PEAK content right here',
    'omg this is actually so good',
    'let\'s gooo \u{1f680}',
    'absolute fire \u{1f525}\u{1f525}\u{1f525}',
    'this part is crazy',
    '\u{1f4af}\u{1f4af}\u{1f4af}',
    'W stream',
    'legendary',
    'goated \u{1f410}',
    '\u{1f525}',
    '\u{1f4af}',
    '\u{1f44f}\u{1f44f}\u{1f44f}',
    '\u2764\ufe0f',
    '\u{1f602}\u{1f602}',
    '\u{1f44d}',
    '\u{1f92f}',
    '\u{1f60d}',
    'how long has this been going?',
    'is this live rn?',
    'wait what just happened?',
    'can someone explain?',
    'is this recorded or live?',
    'what episode is this?',
    'first time here, this is gold',
    'taking notes \u{1f4dd}',
    'sharing this with everyone',
    'subscribed instantly',
    'this cleared my confusion fr',
    'better than Netflix ngl',
    'Love from Hyderabad \u2764\ufe0f',
    'bhai ye toh bohot accha hai',
    'the vibes here are immaculate',
    'saving this for later',
    'elementary, my dear Watson \u{1f50d}',
    'the game is afoot!',
    'brilliant deduction',
    'I see everything',
    'college professors could never \u{1f602}',
    'day 1 fan',
    'notification squad \u{1f514}',
    'been waiting all week for this'
  ];

  var JOIN_PHRASES = [
    'just joined',
    'is now watching',
    'joined the stream',
    'is here \u{1f44b}',
    'just tuned in',
    'joined from Mumbai',
    'joined from Bangalore',
    'joined from Delhi',
    'joined from London'
  ];

  function randItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getTimeStr() {
    var now = new Date();
    var h = now.getHours();
    var m = pad2(now.getMinutes());
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m + ' ' + ampm;
  }

  function createMessage(user, text) {
    var el = document.createElement('div');
    el.className = 'msg';
    var badgeHTML = '';
    if (user.badge === 'mod') {
      badgeHTML = '<span class="msg-badge mod">MOD</span>';
    } else if (user.badge === 'member') {
      badgeHTML = '<span class="msg-badge member">MEMBER</span>';
    }
    el.innerHTML =
      '<div class="msg-line">' +
        badgeHTML +
        '<span class="msg-user" style="color:' + user.color + '">' + user.name + '</span>' +
        '<span class="msg-body">' + text + '</span>' +
        '<span class="msg-time">' + getTimeStr() + '</span>' +
      '</div>';
    return el;
  }

  function createJoin(user) {
    var el = document.createElement('div');
    el.className = 'msg msg-join';
    el.innerHTML =
      '<span class="msg-user" style="color:' + user.color + '">' + user.name + '</span> ' +
      randItem(JOIN_PHRASES);
    return el;
  }

  function createSuperchat(user, text) {
    var el = document.createElement('div');
    el.className = 'msg msg-super';
    el.innerHTML =
      '<div class="msg-line">' +
        '<span class="msg-user">' + user.name + '</span>' +
        '<span class="msg-body">' + text + '</span>' +
      '</div>';
    return el;
  }

  var MAX_MESSAGES = 100;

  function appendToChat(el) {
    chatBox.appendChild(el);
    while (chatBox.children.length > MAX_MESSAGES) {
      chatBox.removeChild(chatBox.firstChild);
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  // Pre-seed chat
  (function seedChat() {
    for (var i = 0; i < 8; i++) {
      var user = randItem(USERS);
      if (i === 3) {
        appendToChat(createJoin(user));
      } else {
        appendToChat(createMessage(user, randItem(MESSAGES)));
      }
    }
  })();

  // Chat scheduler
  var msgCounter = 0;

  function scheduleChat() {
    var delay = 1000 + Math.random() * 2000;
    safeTimeout(function () {
      msgCounter++;
      var user = randItem(USERS);
      if (msgCounter % 9 === 0) {
        appendToChat(createJoin(user));
      } else if (msgCounter % 35 === 0) {
        appendToChat(createSuperchat(user, randItem(MESSAGES)));
      } else {
        appendToChat(createMessage(user, randItem(MESSAGES)));
      }
      scheduleChat();
    }, delay);
  }

  scheduleChat();

  // Burst function (called during viewer spikes)
  function burstChat(count) {
    for (var i = 0; i < count; i++) {
      (function (idx) {
        safeTimeout(function () {
          var user = randItem(USERS);
          appendToChat(createMessage(user, randItem(MESSAGES)));
        }, idx * 300);
      })(i);
    }
  }

  // ── 5. CHAT TAB TOGGLE (cosmetic) ─────────────────────
  document.querySelectorAll('.chat-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.chat-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
    });
  });

})();
