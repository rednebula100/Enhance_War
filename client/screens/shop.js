const Shop = (() => {
  let getSocket;
  let currentCoins = 0;
  let hand = [];

  function init(socketGetter) {
    getSocket = socketGetter;
  }

  let shopLevel = 1;
  const SHOP_UPGRADE_COSTS = [null, 300, 600, 1000, 1600, 2500, null];
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

    _syncCoins(currentCoins);
    const lvDisp = document.getElementById('shop-level-display'); if(lvDisp) lvDisp.textContent = 'Lv.' + shopLevel;
    const upgBtn2 = document.getElementById('btn-upg-shop');
    if (upgBtn2) { const uc = SHOP_UPGRADE_COSTS[shopLevel]; upgBtn2.innerHTML = uc ? 'Lv'+(shopLevel+1)+' 업그레이드<br><span style="font-size:8px;">'+uc+'코인</span>' : '최대 등급'; }
    const hcEl = document.getElementById('shop-hand-count'); if(hcEl) hcEl.textContent = (hand ? hand.length : 0) + ' / 8';
    const hoEl = document.getElementById('shop-hand-owner'); if(hoEl) hoEl.textContent = (window.myDisplayName || '나') + ' 손패';
    const upgradeBtn = document.getElementById('btn-upg-shop');
    if (upgradeBtn) { upgradeBtn.onclick = () => getSocket()?.emit('upgrade_shop'); }    const myNameEl = document.getElementById('shop-my-name');
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

    if (upgBtn) upgBtn.addEventListener('click', () => getSocket()?.emit('upgrade_shop'));

    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `shop-card rarity-${card.rarity}`;
      const rarityColors1 = ['','#9aa0ac','#4fbf66','#3f8be0','#a865e8','#f5972a','#e8463f',null];
      const isR71 = card.rarity === 7;
      const gemColor1 = rarityColors1[card.rarity] || '#9aa0ac';
      if (!isR71) { el.style.background = gemColor1; el.style.boxShadow = '3px 3px 0 rgba(0,0,0,.55)'; }
      el.innerHTML = '<div class="shop-card-inner">'
        + '<div class="card-cost-badge" style="background:' + (isR71 ? '#ffd84d' : gemColor1) + ';width:20px;height:20px;font-size:10px;">' + card.cost + '</div>'
        + '<div class="card-art-area" style="height:52px;margin-top:18px;">' + card.name.substring(0, 2) + '</div>'
        + '<div class="card-name" style="font-size:10px;margin-top:4px;">' + card.name + '</div>'
        + '<div class="card-divider"></div>'
        + '<div class="card-effect" style="font-size:8px;">' + (card.description || '') + '</div>'
        + '</div>';el.addEventListener('click', () => getSocket()?.emit('buy_card', { cardId: card.id }));
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
        const rarityColors2 = ['','#9aa0ac','#4fbf66','#3f8be0','#a865e8','#f5972a','#e8463f',null];
        const isR72 = card.rarity === 7;
        const gemColor2 = rarityColors2[card.rarity] || '#9aa0ac';
        slot.className = 'hand-slot filled rarity-' + card.rarity;
        if (!isR72) { slot.style.background = gemColor2; slot.style.boxShadow = '3px 3px 0 rgba(0,0,0,.55)'; }
        slot.innerHTML = '<div class="hand-slot-inner">'
          + '<div class="card-cost-badge" style="background:' + (isR72 ? '#ffd84d' : gemColor2) + '">' + (card.cost || '') + '</div>'
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
    _syncCoins(currentCoins);
    _renderHand();
    if (cards) _renderShelf(cards);
    const hcEl2 = document.getElementById('shop-hand-count'); if(hcEl2) hcEl2.textContent = (hand ? hand.length : 0) + ' / 8';
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
    _syncCoins(currentCoins);
    _renderHand();
    if (cards) _renderShelf(cards);
    const hcEl2 = document.getElementById('shop-hand-count'); if(hcEl2) hcEl2.textContent = (hand ? hand.length : 0) + ' / 8';
  }

    function onUpgradeResult({ success, shopLevel: newLv, coins, cards }) {
    if (!success) return;
    shopLevel = newLv;
    currentCoins = coins ?? currentCoins;
    _syncCoins(currentCoins);
    if (cards) _renderShelf(cards);
    const hcEl2 = document.getElementById('shop-hand-count'); if(hcEl2) hcEl2.textContent = (hand ? hand.length : 0) + ' / 8';
  }

  function onHandUpdate({ hand: newHand }) {
    if (newHand) { hand = newHand; _renderHand(); }
  }

  return { init, onShopStart, onBuyCardResult, onSellHandCardResult, onHandUpdate, onUpgradeResult };
})();