const Shop = (() => {
  let getSocket;
  let currentCoins = 0;
  let hand = [];

  function init(socketGetter) {
    getSocket = socketGetter;
  }

  function onShopStart({ timeLeft, cards, myState }) {
    currentCoins = myState?.coins ?? currentCoins;
    hand = myState?.hand ?? hand;

    document.getElementById('shop-coins').textContent = `💰 ${Math.floor(currentCoins)}`;
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
    shelf.innerHTML = '';
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = `shop-card rarity-${card.rarity}`;
      el.innerHTML = `
        <div class="card-rarity-label">${'★'.repeat(card.rarity)}</div>
        <div class="card-name">${card.name}</div>
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
        slot.innerHTML = `<span class="card-name">${card.name}</span><span class="card-type">${card.type}</span>`;
        slot.title = `클릭하여 판매 (+${Math.floor(card.cost * 0.5)}코인)`;
        slot.addEventListener('click', () => {
          if (confirm(`'${card.name}' 카드를 판매하겠습니까?\n(+${Math.floor(card.cost * 0.5)}코인)`)) {
            getSocket()?.emit('sell_hand_card', { cardId: card.id });
          }
        });
      }
      bar.appendChild(slot);
    }
  }

  function onBuyCardResult({ success, coins, hand: newHand }) {
    if (!success) return;
    currentCoins = coins;
    hand = newHand;
    document.getElementById('shop-coins').textContent = `💰 ${Math.floor(currentCoins)}`;
    _renderHand();
  }

  function onSellHandCardResult({ success, coins, hand: newHand }) {
    if (!success) return;
    currentCoins = coins;
    hand = newHand;
    document.getElementById('shop-coins').textContent = `💰 ${Math.floor(currentCoins)}`;
    _renderHand();
  }

  return { init, onShopStart, onBuyCardResult, onSellHandCardResult };
})();