const Game = (() => {
  let getSocket;
  let timerInterval = null;
  let state = { myHp: 100, oppHp: 100, myLevel: 0, myCombo: 0, myCoins: 100 };

  // ── 초기화 ────────────────────────────────────
  function init(socketGetter) {
    getSocket = socketGetter;

    document.getElementById('btn-enhance').addEventListener('click', () => {
      getSocket()?.emit('enhance_attempt');
    });

    document.getElementById('btn-sell').addEventListener('click', () => {
      getSocket()?.emit('sell_sword');
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
      showScreen('screen-menu');
    });

    _buildHandSlots('hand-bar');
  }

  // ── 손패 슬롯 생성 ────────────────────────────
  function _buildHandSlots(containerId) {
    const bar = document.getElementById(containerId);
    if (!bar) return;
    bar.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'hand-slot rarity-0';
      slot.style.cssText = 'background:#2a2830;box-shadow:inset 0 0 0 1px #3a3a4a;';
      slot.dataset.index = i;
      const inner = document.createElement('div');
      inner.className = 'hand-slot-inner';
      slot.appendChild(inner);
      bar.appendChild(slot);
    }
  }

  // ── 손패 업데이트 ─────────────────────────────
  function _updateHand(hand, containerId) {
    _buildHandSlots(containerId);
    const slots = document.querySelectorAll(`#${containerId} .hand-slot`);
    slots.forEach((slot, i) => {
      const card = hand[i];
      if (!card) return;
      const rarityColors = ['','#9aa0ac','#4fbf66','#3f8be0','#a865e8','#f5972a','#e8463f',null];
      const isR7 = card.rarity === 7;
      slot.className = `hand-slot filled rarity-${card.rarity}`;
      if (isR7) slot.style.cssText = '';
      else { slot.style.background = rarityColors[card.rarity] || '#9aa0ac'; slot.style.boxShadow = '3px 3px 0 rgba(0,0,0,.55)'; }
      const lvTag = card.xpLevel > 1 ? ` Lv${card.xpLevel}` : '';
      const gemColor = rarityColors[card.rarity] || '#9aa0ac';
      slot.innerHTML = `
        <div class="hand-slot-inner">
          <div class="card-cost-badge" style="background:${isR7?'#ffd84d':gemColor}">${card.cost ?? ''}</div>
          <div class="card-art-area">${card.art || card.name.substring(0,2)}</div>
          <div class="card-name">${card.name}${lvTag}</div>
          <div class="card-divider"></div>
          <div class="card-effect">${card.description ?? ''}</div>
        </div>`;
      slot.title = card.description ?? '';
      if (card.type === 'active') {
        slot.classList.add('active-card');
        slot.addEventListener('click', () => {
          if (confirm(`[액티브] ${card.name}\n${card.description ?? ''}\n\n발동하겠습니까?`)) {
            getSocket()?.emit('use_card', { cardId: card.id });
          }
        });
      }
    });
  }

  // ── 타이머 ────────────────────────────────────
  function _startTimer(seconds, barId, textId) {
    clearInterval(timerInterval);
    const bar = document.getElementById(barId);
    const txt = document.getElementById(textId);
    let left = seconds;

    bar.style.width = '100%';
    bar.style.background = 'var(--hp-green)';
    txt.textContent = left;

    timerInterval = setInterval(() => {
      left--;
      txt.textContent = Math.max(0, left);
      const pct = Math.max(0, (left / seconds) * 100);
      bar.style.width = pct + '%';
      if (pct < 30) bar.style.background = 'var(--danger)';
      if (left <= 0) clearInterval(timerInterval);
    }, 1000);
  }

  // ── 데미지 알림 ───────────────────────────────
  function _flashDamage(text) {
    const el = document.getElementById('damage-overlay');
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1200);
  }

  // ── HP바 업데이트 ─────────────────────────────
  function _updateHp(myHp, oppHp) {
    const clamp = v => Math.max(0, Math.min(100, v));
    const mPct = clamp(myHp) + '%'; const oPct = clamp(oppHp) + '%';
    const el = id => document.getElementById(id);
    if (el('my-hp-bar'))   el('my-hp-bar').style.width   = mPct;
    if (el('my-hp-bar2'))  el('my-hp-bar2').style.width  = mPct;
    if (el('opp-hp-bar'))  el('opp-hp-bar').style.width  = oPct;
    if (el('opp-hp-bar2')) el('opp-hp-bar2').style.width = oPct;
    if (el('my-hp-text'))  el('my-hp-text').textContent  = Math.max(0, Math.round(myHp));
    if (el('my-hp-text2')) el('my-hp-text2').textContent = `${Math.max(0,Math.round(myHp))} / 100`;
    if (el('opp-hp-text')) el('opp-hp-text').textContent = Math.max(0, Math.round(oppHp));
  }

  // ── 내 상태 UI 갱신 ───────────────────────────
  function _updateMyState({ level, combo, coins }) {
    state.myLevel = level ?? state.myLevel;
    state.myCombo = combo ?? state.myCombo;
    state.myCoins = coins ?? state.myCoins;

    const lb = document.getElementById('my-level-badge');   if (lb) lb.textContent = `Lv.${state.myLevel}`;
    const sb = document.getElementById('my-sword-badge');   if (sb) sb.textContent = `Lv.${state.myLevel}`;
    const atkEl = document.getElementById('my-atk');        if (atkEl) atkEl.textContent = state.myLevel * 10;
    const durEl = document.getElementById('my-dur');        if (durEl) durEl.textContent = 50 + state.myLevel * 15;
    const coinsEl = document.getElementById('my-coins');    if (coinsEl) coinsEl.textContent = Math.floor(state.myCoins);
    const comboEl = document.getElementById('my-combo');    if (comboEl) comboEl.textContent = `콤보 ${state.myCombo}`;

    const sellVal = Math.floor(state.myLevel * 50 * (1 + state.myCombo * 0.15));
    const sp = document.getElementById('sell-preview');
    if (sp) sp.textContent = state.myLevel > 0 ? `판매 시 +${sellVal}코인` : '';

    const sellBtn = document.getElementById('btn-sell');
    if (sellBtn) sellBtn.innerHTML = `판매<span style="font-family:'Galmuri7',monospace;font-size:8px;color:#16344f;margin-top:2px;">+${sellVal} 코인</span>`;
  }

  // ── 상대 상태 UI 갱신 ─────────────────────────
  function _updateOppState({ level, atk }) {
    const sb = document.getElementById('opp-sword-badge'); if (sb) sb.textContent = `Lv.${level}`;
    const atkEl = document.getElementById('opp-atk');     if (atkEl) atkEl.textContent = atk;
    const durEl = document.getElementById('opp-dur');     if (durEl) durEl.textContent = `DUR ${50 + level * 15}`;
  }

  // ── 전투 애니메이션 유틸리티 ─────────────────────────────────────────
  let _cooldownTimer = null;
  function _startCooldown(ms) {
    const btn = document.getElementById('btn-enhance');
    const bar = document.getElementById('enhance-cooldown');
    if (!btn || !bar) return;
    clearTimeout(_cooldownTimer);
    btn.disabled = true;
    bar.style.transition = 'none';
    bar.style.width = '0%';
    void bar.offsetWidth;
    bar.style.transition = `width ${ms}ms linear`;
    bar.style.width = '100%';
    _cooldownTimer = setTimeout(() => {
      btn.disabled = false;
      bar.style.transition = 'none';
      bar.style.width = '0%';
    }, ms);
  }

  function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function _setDurBar(who, current, initial) {
    const bar = document.getElementById(`${who}-dur-bar`);
    if (!bar || !initial) return;
    const pct = Math.max(0, (current / initial) * 100);
    bar.style.width = pct + '%';
    bar.style.background = pct > 50 ? 'var(--hp-green)' : pct > 25 ? '#ff9800' : 'var(--danger)';
  }

  async function _playCombatAnimation(hits, myInitDur, oppInitDur, damageTaken, myHp, oppHp) {
    const mySword  = document.getElementById('my-sword-art');
    const oppSword = document.getElementById('opp-sword-art');
    const vsEl     = document.querySelector('.vs-divider');

    _setDurBar('my',  myInitDur,  myInitDur);
    _setDurBar('opp', oppInitDur, oppInitDur);

    if (hits.length === 0) {
      if (damageTaken > 0) {
        _screenShake(1);
        _flashDamage(`-${Math.round(damageTaken)} HP`);
        await _wait(500);
        _updateHp(myHp, oppHp);
      }
      return;
    }

    await _wait(250);

    let interval = 400;
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];

      mySword.classList.add('sword-bump-right');
      oppSword.classList.add('sword-bump-left');
      const bumpDur = Math.min(Math.floor(interval * 0.4), 150);
      setTimeout(() => {
        mySword.classList.remove('sword-bump-right');
        oppSword.classList.remove('sword-bump-left');
      }, bumpDur);

      if (vsEl) {
        const r = vsEl.getBoundingClientRect();
        _spawnParticles(r.left + r.width / 2, r.top + r.height / 2, 4,
          ['#ffffff', '#ffee58', '#ffa726']);
      }

      _setDurBar('my',  hit.myDurAfter,  myInitDur);
      _setDurBar('opp', hit.oppDurAfter, oppInitDur);

      if (i >= 9) interval = Math.max(80, Math.round(interval * 0.9));
      if (i < hits.length - 1) await _wait(interval);
    }

    const last = hits[hits.length - 1];
    await _wait(150);
    if (last.myDurAfter <= 0 && last.oppDurAfter <= 0) {
      mySword.classList.add('sword-break-gray'); oppSword.classList.add('sword-break-gray');
    } else if (last.myDurAfter <= 0) {
      mySword.classList.add('sword-break-gray');
    } else if (last.oppDurAfter <= 0) {
      oppSword.classList.add('sword-break-gray');
    }

    await _wait(550);
    _updateHp(myHp, oppHp);
    if (damageTaken > 0) { _screenShake(1); _flashDamage(`-${Math.round(damageTaken)} HP`); }

    setTimeout(() => {
      mySword.classList.remove('sword-break', 'sword-break-gray');
      oppSword.classList.remove('sword-break', 'sword-break-gray');
    }, 1200);
  }
  // ── 시각 효과 ─────────────────────────────────
  function _getSwordPos() {
    const r = document.getElementById('my-sword-art').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function _spawnParticles(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.8;
      const dist  = 35 + Math.random() * 55;
      p.style.cssText =
        `left:${x}px;top:${y}px;` +
        `background:${colors[i % colors.length]};` +
        `--dx:${(Math.cos(angle) * dist).toFixed(1)}px;` +
        `--dy:${(Math.sin(angle) * dist).toFixed(1)}px`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  function _screenShake(intensity) {
    const el = document.querySelector('.game-arena');
    if (!el) return;
    const cls = intensity >= 2 ? 'shake-lg' : 'shake-sm';
    el.classList.remove('shake-sm', 'shake-lg');
    void el.offsetWidth;
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }

  function _playSuccessEffect(combo) {
    const count  = Math.min(6 + combo * 2, 22);
    const colors = combo >= 5
      ? ['#f0c040','#ff9800','#f44336','#ffffff']
      : ['#f0c040','#f0c040','#e0d0b0'];
    const { x, y } = _getSwordPos();
    _spawnParticles(x, y, count, colors);
    _screenShake(combo >= 5 ? 2 : 1);
  }

  function _playFailEffect() {
    const flash = document.createElement('div');
    flash.className = 'flash-red';
    document.body.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove(), { once: true });
    const sword = document.getElementById('my-sword-art');
    sword.classList.remove('sword-break');
    void sword.offsetWidth;
    sword.classList.add('sword-break');
    sword.addEventListener('animationend', () => sword.classList.remove('sword-break'), { once: true });
  }

  function _playSellEffect(gained) {
    const { x, y } = _getSwordPos();
    const colors = ['#f0c040','#ffd700','#ffaa00'];
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const dist  = 40 + Math.random() * 65;
      p.style.cssText =
        `left:${x}px;top:${y}px;` +
        `background:${colors[i % colors.length]};` +
        `--dx:${(Math.cos(angle) * dist).toFixed(1)}px;` +
        `--dy:${(Math.sin(angle) * dist).toFixed(1)}px`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
    const txt = document.createElement('div');
    txt.className = 'float-text';
    txt.textContent = '+' + Math.floor(gained) + ' 코인';
    txt.style.left = x + 'px';
    txt.style.top  = y + 'px';
    document.body.appendChild(txt);
    txt.addEventListener('animationend', () => txt.remove(), { once: true });
  }

  function _playAnvilHit() {
    const hammer = document.getElementById('hammer-icon');
    if (!hammer) return;
    hammer.classList.remove('hammer-strike');
    void hammer.offsetWidth;
    hammer.classList.add('hammer-strike');
    hammer.addEventListener('animationend', () => hammer.classList.remove('hammer-strike'), { once: true });
  }

  // ── Socket 이벤트 핸들러 ──────────────────────
  function onMatchFound({ opponentName, myState, opponentState }) {
    window.oppDisplayName = opponentName;
    document.getElementById('my-name').textContent = window.myDisplayName || '나';
    document.getElementById('opp-name').textContent = opponentName;
    state.myHp = 100; state.oppHp = 100;
    _updateHp(100, 100);
    _updateMyState({ level: myState.level, combo: myState.combo, coins: myState.coins });
    _updateOppState({ level: opponentState.level, atk: opponentState.atk });
    _buildHandSlots('hand-bar');
  }

  function onRoundStart({ round, timeLeft, myState, opponentState, cooldownMs }) {
    document.getElementById('round-label').textContent = `Round ${round}`;
    clearTimeout(_cooldownTimer);
    document.getElementById('btn-enhance').disabled = false;
    const cdBar = document.getElementById('enhance-cooldown');
    if (cdBar) { cdBar.style.transition = 'none'; cdBar.style.width = '0%'; }
    document.getElementById('btn-sell').disabled = false;
    _startTimer(timeLeft, 'timer-bar', 'timer-text');
    _updateMyState({ level: myState.level, combo: myState.combo, coins: myState.coins });
    _updateOppState({ level: opponentState.level, atk: opponentState.atk });
    _updateHp(myState.hp, opponentState.hp);
    state.myHp = myState.hp; state.oppHp = opponentState.hp;
    _updateHand(myState.hand ?? [], 'hand-bar');
  }

  function onEnhanceResult({ success, level, combo, coins, hand, cooldownMs }) {
    _updateMyState({ level, combo, coins });
    if (hand) _updateHand(hand, 'hand-bar');
    _playAnvilHit();
    if (cooldownMs) _startCooldown(cooldownMs);
    if (success) _playSuccessEffect(combo);
    else         _playFailEffect();
  }

  function onSellResult({ gained, coins, hand }) {
    _updateMyState({ level: 0, combo: 0, coins });
    if (hand) _updateHand(hand, 'hand-bar');
    _playSellEffect(gained ?? 0);
  }

  function onOpponentUpdate({ level, atk }) {
    _updateOppState({ level, atk });
  }

  async function onRoundEnd({ myHp, opponentHp, damageTaken, hits, myInitDur, oppInitDur }) {
    clearInterval(timerInterval);
    document.getElementById('btn-enhance').disabled = true;
    document.getElementById('btn-sell').disabled = true;
    state.myHp = myHp; state.oppHp = opponentHp;
    await _playCombatAnimation(
      hits ?? [], myInitDur ?? 0, oppInitDur ?? 0,
      damageTaken, myHp, opponentHp
    );
  }

  function onUseCardResult({ cardId, hand, coins }) {
    if (hand) _updateHand(hand, 'hand-bar');
    if (coins !== undefined) _updateMyState({ coins });
  }

  function onHandUpdate({ hand }) {
    if (hand) _updateHand(hand, 'hand-bar');
  }

  function onCardEffect({ effect, value, amount, durationMs }) {
    if (effect === 'cracked')  _flashDamage('균열!');
    if (effect === 'slow')     _flashDamage('저주!');
    if (effect === 'stolen' && amount > 0) _flashDamage(`-${amount} 코인!`);
  }

  return {
    init, onMatchFound, onRoundStart,
    onEnhanceResult, onSellResult, onOpponentUpdate, onRoundEnd,
    onUseCardResult, onHandUpdate, onCardEffect,
  };
})();