(function () {
  'use strict';

  const root = document.getElementById('afl-tipping-root');
  if (!root) return;

  const API = (root.dataset.apiUrl || '').replace(/\/$/, '');
  let roundData = null;
  let countdownTimer = null;

  // ── Local storage helpers ──────────────────────────────────────────────────

  function submissionKey(year, round) {
    return 'afl_tip_' + year + '_R' + round;
  }
  function hasSubmitted(year, round) {
    return !!localStorage.getItem(submissionKey(year, round));
  }
  function markSubmitted(year, round) {
    localStorage.setItem(submissionKey(year, round), '1');
  }

  // ── Countdown ─────────────────────────────────────────────────────────────

  function formatMs(ms) {
    if (ms <= 0) return 'Closed';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (d > 0) return d + 'd ' + h + 'h ' + m + 'm';
    if (h > 0) return h + 'h ' + m + 'm ' + sec + 's';
    return m + 'm ' + sec + 's';
  }

  function startCountdown(cutoffIso) {
    var cutoff = new Date(cutoffIso).getTime();
    var el = document.getElementById('afl-countdown');
    if (!el) return;

    if (countdownTimer) clearInterval(countdownTimer);

    function tick() {
      var remaining = cutoff - Date.now();
      if (!el) { clearInterval(countdownTimer); return; }
      el.textContent = formatMs(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        render(Object.assign({}, roundData, { isOpen: false }));
      }
    }

    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // ── Game date formatting ───────────────────────────────────────────────────

  function fmtDate(iso) {
    return new Date(iso).toLocaleString('en-AU', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    });
  }

  // ── HTML builders ─────────────────────────────────────────────────────────

  function gameCard(game) {
    return '<div class="afl-tip-game" data-game-id="' + game.id + '">' +
      '<div class="afl-tip-game__date">' + fmtDate(game.date) + '</div>' +
      '<div class="afl-tip-game__row">' +
        '<button type="button" class="afl-tip-team" data-game-id="' + game.id + '" data-team-id="' + game.hteamid + '">' +
          '<span>' + game.hteam + '</span>' +
        '</button>' +
        '<span class="afl-tip-vs">vs</span>' +
        '<button type="button" class="afl-tip-team" data-game-id="' + game.id + '" data-team-id="' + game.ateamid + '">' +
          '<span>' + game.ateam + '</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  function renderForm(data) {
    root.innerHTML =
      '<div class="afl-tip-header">' +
        '<div class="afl-tip-round">Round ' + data.round + ' — ' + data.year + '</div>' +
        '<div class="afl-tip-countdown">Closes in&nbsp;<strong id="afl-countdown">…</strong></div>' +
      '</div>' +
      '<div class="afl-tip-prizes">' +
        '<span>6 correct&nbsp;&rarr;&nbsp;5% off</span>' +
        '<span>7&nbsp;&rarr;&nbsp;15% off</span>' +
        '<span>8&nbsp;&rarr;&nbsp;25% off</span>' +
        '<span>9&nbsp;&rarr;&nbsp;🏆 Free AFL item</span>' +
      '</div>' +
      '<form id="afl-tip-form" novalidate>' +
        '<div class="afl-tip-games">' +
          data.games.map(gameCard).join('') +
        '</div>' +
        '<div class="afl-tip-foot">' +
          '<input id="afl-tip-email" class="afl-tip-email" type="email" placeholder="your@email.com" autocomplete="email" required />' +
          '<button type="submit" class="afl-tip-submit">Submit Tips</button>' +
        '</div>' +
        '<div id="afl-tip-msg" class="afl-tip-msg" hidden></div>' +
      '</form>';

    startCountdown(data.cutoffTime);
    attachHandlers(data);
  }

  function renderClosed(round) {
    root.innerHTML =
      '<div class="afl-tip-state">' +
        '<div class="afl-tip-state__icon">🔒</div>' +
        '<h3>Round ' + round + ' tipping is closed</h3>' +
        '<p>Tipping closes 10 minutes before the first game. Come back next round!</p>' +
      '</div>';
  }

  function renderDone(round) {
    root.innerHTML =
      '<div class="afl-tip-state">' +
        '<div class="afl-tip-state__icon">✅</div>' +
        '<h3>Tips submitted for Round ' + round + '!</h3>' +
        '<p>We&rsquo;ll email you your score once the round is complete. Good luck!</p>' +
      '</div>';
  }

  function renderErr(msg) {
    root.innerHTML =
      '<div class="afl-tip-state afl-tip-state--error">' +
        '<p>' + msg + '</p>' +
      '</div>';
  }

  // ── Main render ───────────────────────────────────────────────────────────

  function render(data) {
    roundData = data;
    if (hasSubmitted(data.year, data.round)) return renderDone(data.round);
    if (!data.isOpen) return renderClosed(data.round);
    renderForm(data);
  }

  // ── Form interaction ──────────────────────────────────────────────────────

  function attachHandlers(data) {
    document.querySelectorAll('.afl-tip-team').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var gid = this.dataset.gameId;
        document.querySelectorAll('.afl-tip-team[data-game-id="' + gid + '"]').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        this.classList.add('is-selected');
      });
    });

    document.getElementById('afl-tip-form').addEventListener('submit', function (e) {
      e.preventDefault();
      handleSubmit(data);
    });
  }

  function showMsg(type, text) {
    var el = document.getElementById('afl-tip-msg');
    if (!el) return;
    el.hidden = false;
    el.className = 'afl-tip-msg afl-tip-msg--' + type;
    el.textContent = text;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function handleSubmit(data) {
    var email = (document.getElementById('afl-tip-email').value || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMsg('error', 'Please enter a valid email address.');
      return;
    }

    var tips = {};
    for (var i = 0; i < data.games.length; i++) {
      var gid = data.games[i].id;
      var sel = document.querySelector('.afl-tip-team.is-selected[data-game-id="' + gid + '"]');
      if (!sel) {
        showMsg('error', 'Please select a winner for every game before submitting.');
        return;
      }
      tips[gid] = parseInt(sel.dataset.teamId, 10);
    }

    var btn = document.querySelector('.afl-tip-submit');
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    try {
      var res = await fetch(API + '/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, year: data.year, round: data.round, tips: tips }),
      });
      var json = await res.json();

      if (res.ok) {
        markSubmitted(data.year, data.round);
        renderDone(data.round);
      } else if (res.status === 409) {
        markSubmitted(data.year, data.round);
        renderDone(data.round);
      } else {
        showMsg('error', json.error || 'Something went wrong. Please try again.');
        btn.disabled = false;
        btn.textContent = 'Submit Tips';
      }
    } catch (_) {
      showMsg('error', 'Network error — please check your connection and try again.');
      btn.disabled = false;
      btn.textContent = 'Submit Tips';
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  fetch(API + '/api/fixtures')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw new Error(data.error);
      render(data);
    })
    .catch(function (err) {
      console.error('[AFL Tipping]', err);
      renderErr('Unable to load this week\'s games. Please try again shortly.');
    });
})();
