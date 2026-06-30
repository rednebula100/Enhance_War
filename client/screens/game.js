const Game = (() => {
  let getSocket;
  let timerInterval = null;
  let _cooldownRAF = null;
  let state = { myHp: 100, oppHp: 100, myLevel: 0, myCombo: 0, myCoins: 100 };

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

  function _flashDamage(text) {
    const el = document.getElementById('damage-overlay');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 1200);
  }

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
    if (typeof FX !== 'undefined') FX.hpWarning(myHp > 0 && myHp <= 30, myHp);
  }

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

  function _updateOppState({ level, atk }) {
    const sb = document.getElementById('opp-sword-badge'); if (sb) sb.textContent = `Lv.${level}`;
    const atkEl = document.getElementById('opp-atk');     if (atkEl) atkEl.textContent = atk;
    const durEl = document.getElementById('opp-dur');     if (durEl) durEl.textContent = `DUR ${50 + level * 15}`;
  }

  // FX15: rAF 기반 쿨다운 (버튼 내부 bottom-up fill)
  function _startCooldown(ms) {
    const btn = document.getElementById('btn-enhance');
    if (!btn) return;
    cancelAnimationFrame(_cooldownRAF);
    btn.disabled = true;
    if (typeof FX !== 'undefined') FX.setCooldownOverlay(0);

    const t0 = performance.now();
    const step = () => {
      const p = Math.min(100, ((performance.now() - t0) / ms) * 100);
      if (typeof FX !== 'undefined') FX.setCooldownOverlay(p);
      if (p < 100) {
        _cooldownRAF = requestAnimationFrame(step);
      } else {
        btn.disabled = false;
      }
    };
    _cooldownRAF = requestAnimationFrame(step);
  }

  function _playAnvilHit() {
    const hammer = document.getElementById('hammer-icon');
    if (!hammer) return;
    hammer.classList.remove('hammer-strike');
    void hammer.offsetWidth;
    hammer.classList.add('hammer-strike');
    hammer.addEventListener('animationend', () => hammer.classList.remove('hammer-strike'), { once: true });
  }

  // FX07: 교전 애니메이션을 FX 모듈로 위임
  async function _playCombatAnimation(hits, myInitDur, oppInitDur, damageTaken, myHp, oppHp) {
    if (typeof FX !== 'undefined') {
      await FX.combat(hits ?? [], myInitDur ?? 0, oppInitDur ?? 0, damageTaken, myHp, oppHp,
        (my, opp) => _updateHp(my, opp),
        (text)    => _flashDamage(text)
      );
    } else {
      // FX 미로드 시 최소 fallback
      _updateHp(myHp, oppHp);
      if (damageTaken > 0) _flashDamage(`-${Math.round(damageTaken)} HP`);
    }
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
    cancelAnimationFrame(_cooldownRAF);
    const btn = document.getElementById('btn-enhance');
    if (btn) btn.disabled = false;
    if (typeof FX !== 'undefined') FX.setCooldownOverlay(0);
    document.getElementById('btn-sell').disabled = false;
    _startTimer(timeLeft, 'timer-bar', 'timer-text');
    _updateMyState({ level: myState.level, combo: myState.combo, coins: myState.coins });
    _updateOppState({ level: opponentState.level, atk: opponentState.atk });
    _updateHp(myState.hp, opponentState.hp);
    state.myHp = myState.hp; state.oppHp = opponentState.hp;
    _updateHand(myState.hand ?? [], 'hand-bar');
    if (typeof FX !== 'undefined') FX.roundStart(round);
  }

  function onEnhanceResult({ success, level, combo, coins, hand, cooldownMs }) {
    const prevCoins = state.myCoins;
    _updateMyState({ level, combo, coins });
    if (hand) _updateHand(hand, 'hand-bar');
    _playAnvilHit();
    if (cooldownMs) _startCooldown(cooldownMs);

    const delta = Math.abs(coins - prevCoins);
    if (typeof FX !== 'undefined') {
      FX.coinChange('minus', delta);
      if (success) FX.success(combo);
      else         FX.fail();
    }
  }

  function onSellResult({ gained, coins, hand }) {
    _updateMyState({ level: 0, combo: 0, coins });
    if (hand) _updateHand(hand, 'hand-bar');
    if (typeof FX !== 'undefined') {
      FX.sell(gained ?? 0);
      FX.coinChange('plus', gained ?? 0);
    }
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