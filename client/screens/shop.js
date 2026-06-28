const Shop = (() => {
  let getSocket;
  let currentCoins = 0;
  let hand = [];

  function init(socketGetter) {
    getSocket = socketGetter;
  }

  let shopLevel = 1;
  const SHOP_UPGRADE_COSTS = [null, 300, 600, 1000, 1600, 2500, null];

  function _showToast(msg) {
    let t = document.getElementById('shop-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'shop-toast';
      t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
        'background:rgba(0,0,0,.85);color:#fff;padding:8px 18px;border-radius:6px;' +
        'font-size:13px;z-index:999;pointer-events:none;transition:opacity .3s;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._tid);
    t._tid = setTimeout(() => { t.style.opacity = '0'; }, 2000);
  }

  function onShopStart({ timeLeft, cards, myState }) {
    currentCoins = myState?.coins ?? currentCoins;
    hand = myState?.hand ?? hand;
    shopLevel = myState?.shopLevel ?? shopLevel;

    document.getElementById('shop-coins').textContent = `💰 ${Math.floor(currentCoins)}`;
    const myNameEl = document.getElementById('shop-my-name');
    const oppNameEl = document.getElementById('shop-opp-name');
    if (myNameEl)  myNameEl.textContent  = window.myDisplayName  || '나';
    if (oppNameEl) oppNameEl.textContent = window.oppDisplayName || '상대방';
    _startShopTimer(timeLeft);
    _renderShelf(cards);
    _renderHand();
  }

  function _startShopTimer(seconds) {
    const bar = document.getElementById('shop-timer-bar');
    const txt = document.getElementById('shop-timer-text');
    bar.style.width = '100%';
    bar.style.background = 'var(--hp-green)';
    txt.textContent = seconds;
    let left = seconds;
    const interval = setInterval(() => {
      left--;
      txt.textContent = Math.max(0, left);
      bar.style.width = Math.max(0, (left / seconds) * 100) + '%';
      if (left <= 0) clearInterval(interval);
    }, 1000);
  }

  function _renderShelf(cards) {
    const shelf = document.getElementById('shop-shelf');
    if (!shelf) return;
    shelf.innerHTML = '';

    // 상점 레벨 + 업그레이드 버튼
    const lvEl = document.createElement('div');
    lvEl.style.cssText = 'grid-column:1/-1;text-align:right;font-size:11px;color:var(--text-dim);margin-bottom:4px;';
    const upgCost = SHOP_UPGRADE_COSTS[shopLevel];
    if (upgCost) {
      lvEl.innerHTML = `상점 Lv${shopLevel} <button id="btn-upg-shop" style="margin-left:6px;font-size:10px;cursor:pointer;">Lv${shopLevel + 1}으로 업그레이드 (${upgCost}코인)</button>`;
    } else {
      lvEl.textContent = `상점 Lv${shopLevel} (최대)`;
    }
    shelf.appendChild(lvEl);
    const upgBtn = shelf.querySelector('#btn-upg-shop');
    if (upgBtn) upgBtn.addEventListener('click', () => getSocket()?.emit('upgrade_shop'));

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `shop-card rarity-${card.rarity}`;
      const iconBg1 = ['','#888','#4caf50','#2196f3','#9c27b0','#f44336','#ff9800','#f0c040'][card.rarity] || '#888';
      el.innerHTML = `
        <div class="card-icon-box" style="background:${iconBg1}"></div>
        <div class="card-rarity-label">${'★'.repeat(card.rarity)}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-desc">${card.description ?? ''}</div>
        <div class="card-type">${card.type}</div>
        <div class="card-cost">${card.cost}코인</div>
      `;
      el.addEventListener('click', () => getSocket()?.emit('buy_card', { cardId: card.id }));
      shelf.appendChild(el);
    });
  }

  function _renderHand() {
    const bar = document.getElementById('shop-hand-bar');
    bar.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      const card = hand[i];
      slot.className = card ? `hand-slot filled rarity-${card.rarity}` : 'hand-slot';
      if (card) {
        const iconBg2 = ['','#888','#4caf50','#2196f3','#9c27b0','#f44336','#ff9800','#f0c040'][card.rarity] || '#888';
        slot.innerHTML = `<div class="card-icon-box" style="background:${iconBg2}"></div><span class="card-rarity-label">${'★'.repeat(card.rarity)}</span><span class="card-name">${card.name}</span>`;
        slot.title = `${card.name}\n${card.description ?? ''}\n\n클릭하여 판매 (+${card.sellPrice ?? Math.floor(card.cost * 0.5)}코인)`;
        slot.addEventListener('click', () => {
          const sp = card.sellPrice ?? Math.floor(card.cost * 0.5);
          if (confirm(`'${card.name}' 카드를 판매하겠습니까?\n(+${sp}코인)`)) {
            getSocket()?.emit('sell_hand_card', { cardId: card.id });
          }
        });
      }
      bar.appendChild(slot);
    }
  }

  function onBuyCardResult({ success, absorbed, leveled, coins, hand: newHand, reason }) {
    if (!success) {
      const msg = reason === 'HAND_FULL'           ? '손패가 꽉 찼습니다 (최대 8장)'
                : reason === 'INSUFFICIENT_COINS'  ? '코인이 부족합니다'
                : '구매할 수 없습니다';
      _showToast(msg);
      return;
    }
    currentCoins = coins;
    hand = newHand;
    document.getElementById('shop-coins').textContent = `💰 ${Math.floor(currentCoins)}`;
    _renderHand();
    if (cards) _renderShelf(cards);
    if (absorbed) {
      const msg = leveled ? '카드 레벨 업! 효과가 강화되었습니다.' : '카드 흡수 완료 (XP 획득)';
      const el = document.getElementById('shop-coins');
      const tip = document.createElement('span');
      tip.textContent = ' ' + msg;
      tip.style.cssText = 'font-size:10px;color:#4caf50;';
      el.parentNode.appendChild(tip);
      setTimeout(() => tip.remove(), 2000);
    }
  }

  function onSellHandCardResult({ success, coins, hand: newHand }) {
    if (!success) return;
    currentCoins = coins;
    hand = newHand;
    document.getElementById('shop-coins').textContent = `💰 ${Math.floor(currentCoins)}`;
    _renderHand();
    if (cards) _renderShelf(cards);
  }

    function onUpgradeResult({ success, shopLevel: newLv, coins, cards }) {
    if (!success) return;
    shopLevel = newLv;
    currentCoins = coins ?? currentCoins;
    document.getElementById('shop-coins').textContent = `💰 ${Math.floor(currentCoins)}`;
    if (cards) _renderShelf(cards);
  }

  function onHandUpdate({ hand: newHand }) {
    if (newHand) { hand = newHand; _renderHand(); }
  }

  return { init, onShopStart, onBuyCardResult, onSellHandCardResult, onHandUpdate, onUpgradeResult };
})();