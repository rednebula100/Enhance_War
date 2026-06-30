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
      slot.style.cssText = 'width:136px;height:180px;flex:none;background:#1e1c24;border:2px solid #2a2836;box-shadow:inset 0 0 0 1px #34303c;box-sizing:border-box;';
      slot.dataset.index = i;
      bar.appendChild(slot);
    }
  }

  function _updateHand(hand, containerId) {
    _buildHandSlots(containerId);
    const bar = document.getElementById(containerId);
    if (!bar) return;
    const slots = bar.querySelectorAll('div[data-index]');
    slots.forEach((slot, i) => {
      const card = hand[i];
      if (!card) return;
      slot.innerHTML = (typeof FX !== 'undefined') ? FX.buildCardHTML(card) : card.name;
      slot.style.cssText = 'width:136px;height:180px;flex:none;box-sizing:border-box;cursor:' + (card.type==='active'?'pointer':'default') + ';';
      slot.title = card.description ?? '';
      if (card.type === 'active') {
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

  let _dmgTimer = null;
  function _flashDamage(text) {
    const el = document.getElementById('damage-overlay');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    clearTimeout(_dmgTimer);
    _dmgTimer = setTimeout(() => { el.style.display = 'none'; }, 1200);
  }

  function _updateHp(myHp, oppHp) {
    const clamp = v => Math.max(0, Math.min(100, v));
    const mPct = clamp(myHp) + '%'; const oPct = clamp(oppHp) + '%';
    const el = id => document.getElementById(id);
    if (el('my-hp-bar'))   el('my-hp-bar').style.width   = mPct;
    if (el('my-hp-bar2'))  el('my-hp-bar2').style.width  = mPct;
    if (el('opp-hp-bar'))  el('opp-hp-bar').style.width  = oPct;
    if (el('opp-hp-bar2')) el('opp-hp-bar2').style.width = oPct;
    if (el('my-hp-text'))  el('my-hp-text').textContent  = `${Math.max(0,Math.round(myHp))}/100`;
    if (el('my-hp-text2')) el('my-hp-text2').textContent = `${Math.max(0,Math.round(myHp))} / 100`;
    if (el('opp-hp-text')) el('opp-hp-text').textContent = `${Math.max(0,Math.round(oppHp))}/100`;
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

    const sellCoinLbl = document.getElementById('sell-coin-label');
    if (sellCoinLbl) sellCoinLbl.textContent = `+${sellVal} 코인`;

    const costLbl = document.getElementById('enhance-cost-label');
    const rateLbl = document.getElementById('enhance-rate-label');
    if (costLbl || rateLbl) {
      const cost = Math.round(10 * Math.pow(1.25, state.myLevel));
      const rate = Math.round(5 + 90 * Math.pow(0.82, state.myLevel));
      if (costLbl) { costLbl.textContent = cost + 'c'; costLbl.style.color = state.myCoins >= cost ? '#ffd76a' : '#e87a72'; }
      if (rateLbl) { rateLbl.textContent = rate + '%'; rateLbl.style.color = rate >= 60 ? '#7fe47c' : rate >= 30 ? '#f5a93a' : '#e87a72'; }
    }
  }

  function _updateOppState({ level, atk }) {
    const sb = document.getElementById('opp-sword-badge'); if (sb) sb.textContent = `Lv.${level}`;
    const atkEl = document.getElementById('opp-atk');     if (atkEl) atkEl.textContent = atk;
    const durEl = document.getElementById('opp-dur');     if (durEl) durEl.textContent = `DUR ${50 + level * 15}`;
    const oppDurTxt = document.getElementById('opp-dur-text'); if (oppDurTxt) oppDurTxt.textContent = 50 + level * 15;
  }

  // FX15: rAF 기반 쿨다운 — FX15 verbatim (버튼 외부 sibling overlay)
  function _startCooldown(ms) {
    const btn = document.getElementById('btn-enhance');
    const overlay = document.getElementById('enhance-cooldown-overlay');
    const fill = document.getElementById('enhance-cooldown-fill');
    const scan = document.getElementById('enhance-cooldown-scan');
    if (!btn) return;
    cancelAnimationFrame(_cooldownRAF);
    btn.disabled = true;
    if (overlay) overlay.style.display = 'block';
    if (fill) fill.style.height = '0%';
    if (scan) scan.style.bottom = '0%';

    const t0 = performance.now();
    const step = () => {
      const p = Math.min(100, ((performance.now() - t0) / ms) * 100);
      const disp = Math.round(p / 4) * 4;
      if (fill) fill.style.height = disp + '%';
      if (scan) scan.style.bottom = 'calc(' + disp + '% - 1px)';
      if (p < 100) {
        _cooldownRAF = requestAnimationFrame(step);
      } else {
        btn.disabled = false;
        if (overlay) overlay.style.display = 'none';
        if (fill) fill.style.height = '0%';
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
    const ov = document.getElementById('enhance-cooldown-overlay'); if (ov) ov.style.display = 'none';
    const fill3 = document.getElementById('enhance-cooldown-fill'); if (fill3) fill3.style.height = '0%';
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

  function onOpponentUpdate({ level, atk, handCount }) {
    _updateOppState({ level, atk });
    if (handCount !== undefined) {
      const hcEl = document.getElementById('opp-hand-count');
      if (hcEl) hcEl.textContent = '\xd7' + handCount;
    }
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