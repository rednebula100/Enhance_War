const Shop = (() => {
  let getSocket;
  let currentCoins = 0;
  let hand = [];
  let currentCards = [];  // _renderShelf가 저장, onBuyCardResult에서 참조
  let shopLevel = 1;
  const SHOP_UPGRADE_COSTS = [null, 300, 600, 1000, 1600, 2500, null];

  function init(socketGetter) {
    getSocket = socketGetter;
    document.getElementById('btn-shop-reroll')?.addEventListener('click', () => getSocket()?.emit('reroll_shop'));
    document.getElementById('btn-shop-freeze')?.addEventListener('click', () => getSocket()?.emit('freeze_shop'));
  }

  function _syncCoins(c) {
    currentCoins = c;
    const e1 = document.getElementById('shop-coins');  if (e1) e1.textContent = Math.floor(c);
    const e2 = document.getElementById('shop-coins2'); if (e2) e2.textContent = Math.floor(c) + ' 코인';
  }

  function _showToast(msg) {
    let t = document.getElementById('shop-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'shop-toast';
      t.style.cssText =
        'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,.85);color:#fff;padding:8px 18px;' +
        'font-family:\'Galmuri11\',sans-serif;font-size:13px;' +
        'z-index:9010;pointer-events:none;animation:fx_toastIn 2.4s steps(8) both;';
      document.body.appendChild(t);
      t.addEventListener('animationend', () => t.remove(), { once: true });
    }
    t.textContent = msg;
  }

  function onShopStart({ timeLeft, cards, myState }) {
    currentCoins = myState?.coins ?? currentCoins;
    hand         = myState?.hand  ?? hand;
    shopLevel    = myState?.shopLevel ?? shopLevel;

    _syncCoins(currentCoins);

    const lvDisp = document.getElementById('shop-level-display');
    if (lvDisp) lvDisp.textContent = 'Lv.' + shopLevel;

    const upgBtn = document.getElementById('btn-upg-shop');
    if (upgBtn) {
      const uc = SHOP_UPGRADE_COSTS[shopLevel];
      upgBtn.innerHTML = uc
        ? 'Lv' + (shopLevel + 1) + ' 업그레이드<br><span style="font-size:8px;">' + uc + '코인</span>'
        : '최대 등급';
      upgBtn.onclick = () => getSocket()?.emit('upgrade_shop');
    }

    const hcEl = document.getElementById('shop-hand-count');
    if (hcEl) hcEl.textContent = '손패 ' + (hand ? hand.length : 0) + ' / 8';

    const hoEl = document.getElementById('shop-hand-owner');
    if (hoEl) hoEl.textContent = (window.myDisplayName || '나') + ' 손패';

    const myNameEl  = document.getElementById('shop-my-name');
    const oppNameEl = document.getElementById('shop-opp-name');
    if (myNameEl)  myNameEl.textContent  = window.myDisplayName  || '나';
    if (oppNameEl) oppNameEl.textContent = window.oppDisplayName || '상대방';

    _startShopTimer(timeLeft);
    _renderShelf(cards);
    _renderHand();

    if (typeof FX !== 'undefined') FX.shopOpen();
  }

  function _startShopTimer(seconds) {
    const bar = document.getElementById('shop-timer-bar');
    const txt = document.getElementById('shop-timer-text');
    if (!bar || !txt) return;
    bar.style.width = '100%';
    bar.style.background = 'var(--hp-green)';
    txt.textContent = seconds;
    let left = seconds;
    const iv = setInterval(() => {
      left--;
      txt.textContent = Math.max(0, left);
      bar.style.width = Math.max(0, (left / seconds) * 100) + '%';
      if (left <= 0) clearInterval(iv);
    }, 1000);
  }

  function _renderShelf(cards) {
    currentCards = cards ?? [];
    const shelf = document.getElementById('shop-shelf');
    if (!shelf) return;
    shelf.innerHTML = '';

    currentCards.forEach(card => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'cursor:pointer;flex:none;width:136px;height:180px;';
      wrapper.title = card.name + '\n' + (card.description || '');
      wrapper.innerHTML = (typeof FX !== 'undefined') ? FX.buildCardHTML(card) : card.name;
      wrapper.addEventListener('click', () => getSocket()?.emit('buy_card', { cardId: card.id }));
      shelf.appendChild(wrapper);

      if (card.rarity === 7 && typeof FX !== 'undefined') {
        setTimeout(() => FX.sevenStarReveal(wrapper), 200);
      }
    });
  }

  function _renderHand() {
    const bar = document.getElementById('shop-hand-bar');
    if (!bar) return;
    bar.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      const card = hand[i];
      if (card) {
        slot.style.cssText = 'width:136px;height:180px;flex:none;box-sizing:border-box;cursor:pointer;';
        slot.innerHTML = (typeof FX !== 'undefined') ? FX.buildCardHTML(card) : card.name;
        slot.title = card.name + '\n' + (card.description ?? '') + '\n\n클릭하여 판매 (+' + (card.sellPrice ?? Math.floor(card.cost * 0.5)) + '코인)';
        slot.addEventListener('click', () => {
          const sp = card.sellPrice ?? Math.floor(card.cost * 0.5);
          if (confirm(`'${card.name}' 카드를 판매하겠습니까?\n(+${sp}코인)`)) {
            getSocket()?.emit('sell_hand_card', { cardId: card.id });
          }
        });
      } else {
        slot.style.cssText = 'width:136px;height:180px;flex:none;box-sizing:border-box;background:#1e1c24;border:2px solid #2a2836;box-shadow:inset 0 0 0 1px #34303c;';
      }
      bar.appendChild(slot);
    }
  }

  function onBuyCardResult({ success, absorbed, leveled, coins, hand: newHand, reason }) {
    if (!success) {
      const msg = reason === 'HAND_FULL'          ? '손패가 꽉 찼습니다 (최대 8장)'
                : reason === 'INSUFFICIENT_COINS' ? '코인이 부족합니다'
                : '구매할 수 없습니다';
      _showToast(msg);
      if (typeof FX !== 'undefined') FX.coinChange('deny', 0);
      return;
    }

    const prevCoins = currentCoins;
    currentCoins = coins;
    hand = newHand;
    _syncCoins(currentCoins);
    _renderHand();
    _renderShelf(currentCards);
    const hcEl = document.getElementById('shop-hand-count');
    if (hcEl) hcEl.textContent = '손패 ' + (hand ? hand.length : 0) + ' / 8';

    if (typeof FX !== 'undefined') {
      FX.coinChange('minus', prevCoins - coins);
      if (leveled) {
        // 레벨업 카드 FX — 마지막으로 추가된 손패 슬롯 엘리먼트를 anchor로 넘김
        const slots = document.querySelectorAll('#shop-hand-bar .hand-slot');
        const anchor = slots[slots.length - 1] || null;
        FX.cardLevelUp(anchor);
      }
    }

    if (absorbed) {
      const msg = leveled ? '카드 레벨 업! 효과가 강화되었습니다.' : '카드 흡수 완료 (XP 획득)';
      _showToast(msg);
    }
  }

  function onSellHandCardResult({ success, coins, hand: newHand }) {
    if (!success) return;
    currentCoins = coins;
    hand = newHand;
    _syncCoins(currentCoins);
    _renderHand();
    _renderShelf(currentCards);
    const hcEl = document.getElementById('shop-hand-count');
    if (hcEl) hcEl.textContent = '손패 ' + (hand ? hand.length : 0) + ' / 8';
  }

  function onUpgradeResult({ success, shopLevel: newLv, coins, cards }) {
    if (!success) return;
    shopLevel = newLv;
    currentCoins = coins ?? currentCoins;
    _syncCoins(currentCoins);
    if (cards) _renderShelf(cards);
    const hcEl = document.getElementById('shop-hand-count');
    if (hcEl) hcEl.textContent = '손패 ' + (hand ? hand.length : 0) + ' / 8';
  }

  function onHandUpdate({ hand: newHand }) {
    if (newHand) { hand = newHand; _renderHand(); }
  }

  function onRerollResult({ success, cards, coins, cost, nextCost, reason }) {
    if (!success) {
      _showToast(reason === 'INSUFFICIENT_COINS' ? '코인이 부족합니다' : '리롤 불가');
      return;
    }
    currentCoins = coins;
    _syncCoins(currentCoins);
    _renderShelf(cards);
    // 리롤 버튼 다음 비용 표시
    const rerollCostEl = document.querySelector('#btn-shop-reroll span:last-child');
    if (rerollCostEl) rerollCostEl.textContent = nextCost + ' 코인';
    if (typeof FX !== 'undefined') FX.coinChange('minus', cost);
  }

  function onFreezeResult({ success, frozen, freezeLeft, reason }) {
    if (!success) {
      _showToast(reason === 'NO_USES' ? '얼리기 횟수를 다 사용했습니다' : '얼리기 불가');
      return;
    }
    const lbl = document.getElementById('freeze-label');
    const leftEl = document.getElementById('freeze-left');
    if (lbl) lbl.textContent = frozen ? '🔒 얼림' : '❄ 얼리기';
    if (leftEl) leftEl.textContent = freezeLeft;
    const btn = document.getElementById('btn-shop-freeze');
    if (btn) btn.style.opacity = frozen ? '0.75' : '1';
  }

  return { init, onShopStart, onBuyCardResult, onSellHandCardResult, onHandUpdate, onUpgradeResult, onRerollResult, onFreezeResult };
})();