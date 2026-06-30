const Shop = (() => {
  let getSocket;
  let currentCoins = 0;
  let hand = [];
  let currentCards = [];  // _renderShelf가 저장, onBuyCardResult에서 참조
  let shopLevel = 1;
  const SHOP_UPGRADE_COSTS = [null, 300, 600, 1000, 1600, 2500, null];

  function init(socketGetter) {
    getSocket = socketGetter;
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
    if (hcEl) hcEl.textContent = (hand ? hand.length : 0) + ' / 8';

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

    const rarityColors = ['','#9aa0ac','#4fbf66','#3f8be0','#a865e8','#f5972a','#e8463f',null];
    currentCards.forEach(card => {
      const el = document.createElement('div');
      const isR7 = card.rarity === 7;
      el.className = `shop-card rarity-${card.rarity}`;
      const gemColor = rarityColors[card.rarity] || '#9aa0ac';
      if (!isR7) { el.style.background = gemColor; el.style.boxShadow = '3px 3px 0 rgba(0,0,0,.55)'; }
      el.innerHTML =
        '<div class="shop-card-inner">'
        + '<div class="card-cost-badge" style="background:' + (isR7 ? '#ffd84d' : gemColor) + ';width:20px;height:20px;font-size:10px;">' + card.cost + '</div>'
        + '<div class="card-art-area" style="height:52px;margin-top:18px;">' + card.name.substring(0, 2) + '</div>'
        + '<div class="card-name" style="font-size:10px;margin-top:4px;">' + card.name + '</div>'
        + '<div class="card-divider"></div>'
        + '<div class="card-effect" style="font-size:8px;">' + (card.description || '') + '</div>'
        + '</div>';
      el.addEventListener('click', () => getSocket()?.emit('buy_card', { cardId: card.id }));
      shelf.appendChild(el);

      if (isR7 && typeof FX !== 'undefined') {
        setTimeout(() => FX.sevenStarReveal(), 200);
      }
    });
  }

  function _renderHand() {
    const bar = document.getElementById('shop-hand-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const rarityColors = ['','#9aa0ac','#4fbf66','#3f8be0','#a865e8','#f5972a','#e8463f',null];
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      const card = hand[i];
      if (card) {
        const isR7 = card.rarity === 7;
        const gemColor = rarityColors[card.rarity] || '#9aa0ac';
        slot.className = 'hand-slot filled rarity-' + card.rarity;
        if (!isR7) { slot.style.background = gemColor; slot.style.boxShadow = '3px 3px 0 rgba(0,0,0,.55)'; }
        slot.innerHTML =
          '<div class="hand-slot-inner">'
          + '<div class="card-cost-badge" style="background:' + (isR7 ? '#ffd84d' : gemColor) + '">' + (card.cost || '') + '</div>'
          + '<div class="card-art-area">' + card.name.substring(0, 2) + '</div>'
          + '<div class="card-name">' + card.name + '</div>'
          + '<div class="card-divider"></div>'
          + '<div class="card-effect">' + (card.description || '') + '</div></div>';
        slot.title = `${card.name}\n${card.description ?? ''}\n\n클릭하여 판매 (+${card.sellPrice ?? Math.floor(card.cost * 0.5)}코인)`;
        slot.addEventListener('click', () => {
          const sp = card.sellPrice ?? Math.floor(card.cost * 0.5);
          if (confirm(`'${card.name}' 카드를 판매하겠습니까?\n(+${sp}코인)`)) {
            getSocket()?.emit('sell_hand_card', { cardId: card.id });
          }
        });
      } else {
        slot.className = 'hand-slot rarity-0';
        slot.style.cssText = 'background:#2a2830;box-shadow:inset 0 0 0 1px #3a3a4a;';
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
    if (hcEl) hcEl.textContent = (hand ? hand.length : 0) + ' / 8';

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
    if (hcEl) hcEl.textContent = (hand ? hand.length : 0) + ' / 8';
  }

  function onUpgradeResult({ success, shopLevel: newLv, coins, cards }) {
    if (!success) return;
    shopLevel = newLv;
    currentCoins = coins ?? currentCoins;
    _syncCoins(currentCoins);
    if (cards) _renderShelf(cards);
    const hcEl = document.getElementById('shop-hand-count');
    if (hcEl) hcEl.textContent = (hand ? hand.length : 0) + ' / 8';
  }

  function onHandUpdate({ hand: newHand }) {
    if (newHand) { hand = newHand; _renderHand(); }
  }

  return { init, onShopStart, onBuyCardResult, onSellHandCardResult, onHandUpdate, onUpgradeResult };
})();