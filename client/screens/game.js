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
    bar.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'hand-slot';
      slot.dataset.index = i;
      bar.appendChild(slot);
    }
  }

  // ── 손패 업데이트 ─────────────────────────────
  function _updateHand(hand, containerId) {
    const slots = document.querySelectorAll(`#${containerId} .hand-slot`);
    slots.forEach((slot, i) => {
      const card = hand[i];
      if (card) {
        slot.className = `hand-slot filled rarity-${card.rarity}`;
        slot.innerHTML = `<span class="card-name">${card.name}</span><span class="card-type">${card.type}</span>`;
      } else {
        slot.className = 'hand-slot';
        slot.innerHTML = '';
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
    document.getElementById('my-hp-bar').style.width  = clamp(myHp)  + '%';
    document.getElementById('opp-hp-bar').style.width = clamp(oppHp) + '%';
    document.getElementById('my-hp-text').textContent  = Math.max(0, Math.round(myHp));
    document.getElementById('opp-hp-text').textContent = Math.max(0, Math.round(oppHp));
  }

  // ── 내 상태 UI 갱신 ───────────────────────────
  function _updateMyState({ level, combo, coins }) {
    state.myLevel = level ?? state.myLevel;
    state.myCombo = combo ?? state.myCombo;
    state.myCoins = coins ?? state.myCoins;

    document.getElementById('my-sword-badge').textContent = `Lv.${state.myLevel}`;
    document.getElementById('my-atk').textContent = `ATK ${state.myLevel * 10}`;
    document.getElementById('my-dur').textContent = `DUR ${50 + state.myLevel * 15}`;
    document.getElementById('my-coins').textContent = `💰 ${Math.floor(state.myCoins)}`;
    document.getElementById('my-combo').textContent = `콤보 ${state.myCombo}`;

    const sellVal = Math.floor(state.myLevel * 50 * (1 + state.myCombo * 0.15));
    document.getElementById('sell-preview').textContent =
      state.myLevel > 0 ? `판매 시 +${sellVal}코인` : '';
  }

  // ── 상대 상태 UI 갱신 ─────────────────────────
  function _updateOppState({ level, atk }) {
    document.getElementById('opp-sword-badge').textContent = `Lv.${level}`;
    document.getElementById('opp-atk').textContent = `ATK ${atk}`;
    document.getElementById('opp-dur').textContent = `DUR ${50 + level * 15}`;
  }

  // ── Socket 이벤트 핸들러 ──────────────────────
  function onMatchFound({ opponentName, myState, opponentState }) {
    document.getElementById('my-name').textContent = window.myDisplayName || '나';
    document.getElementById('opp-name').textContent = opponentName;
    state.myHp = 100; state.oppHp = 100;
    _updateHp(100, 100);
    _updateMyState({ level: myState.level, combo: myState.combo, coins: myState.coins });
    _updateOppState({ level: opponentState.level, atk: opponentState.atk });
    _buildHandSlots('hand-bar');
  }

  function onRoundStart({ round, timeLeft, myState, opponentState }) {
    document.getElementById('round-label').textContent = `Round ${round}`;
    document.getElementById('btn-enhance').disabled = false;
    document.getElementById('btn-sell').disabled = false;
    _startTimer(timeLeft, 'timer-bar', 'timer-text');
    _updateMyState({ level: myState.level, combo: myState.combo, coins: myState.coins });
    _updateOppState({ level: opponentState.level, atk: opponentState.atk });
    _updateHp(myState.hp, opponentState.hp);
    state.myHp = myState.hp; state.oppHp = opponentState.hp;
    _updateHand(myState.hand ?? [], 'hand-bar');
  }

  function onEnhanceResult({ success, level, combo, coins, hand }) {
    _updateMyState({ level, combo, coins });
    if (hand) _updateHand(hand, 'hand-bar');
  }

  function onSellResult({ coins, hand }) {
    _updateMyState({ level: 0, combo: 0, coins });
    if (hand) _updateHand(hand, 'hand-bar');
  }

  function onOpponentUpdate({ level, atk }) {
    _updateOppState({ level, atk });
  }

  function onRoundEnd({ myHp, opponentHp, damageTaken }) {
    clearInterval(timerInterval);
    document.getElementById('btn-enhance').disabled = true;
    document.getElementById('btn-sell').disabled = true;
    _updateHp(myHp, opponentHp);
    state.myHp = myHp; state.oppHp = opponentHp;
    if (damageTaken > 0) _flashDamage(`-${Math.round(damageTaken)} HP`);
  }

  return {
    init, onMatchFound, onRoundStart,
    onEnhanceResult, onSellResult, onOpponentUpdate, onRoundEnd,
  };
})();