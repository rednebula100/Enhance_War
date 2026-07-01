const Shop = (() => {
  let getSocket;
  let currentCoins = 0;
  let _upgPanelOpen = false;
  let _statUpgrades = { successLv: 0, successBonus: 0, cooldownLv: 0, cooldownMul: 1.0 };
  let hand = [];
  let currentCards = [];  // _renderShelf가 저장, onBuyCardResult에서 참조
  let shopLevel = 1;
  const SHOP_UPGRADE_COSTS = [null, 300, 600, 1000, 1600, 2500, null];

  function _triggerAnim(el, anim) {
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = anim;
  }

  function init(socketGetter) {
    getSocket = socketGetter;
    // 리롤: fx_btnPress + 기존 카드 fx_cardOut → 서버 emit (Battle.dc.html verbatim)
    document.getElementById('btn-shop-reroll')?.addEventListener('click', () => {
      _triggerAnim(document.getElementById('btn-shop-reroll'), 'fx_btnPress .3s steps(3) both');
      const shelf = document.getElementById('shop-shelf');
      if (shelf) Array.from(shelf.children).forEach((c, i) => {
        c.style.animation = 'fx_cardOut .3s steps(4) ' + (i * 0.04) + 's both';
      });
      getSocket()?.emit('reroll_shop');
    });
    // 얼리기: fx_btnPress (Battle.dc.html verbatim)
    document.getElementById('btn-shop-freeze')?.addEventListener('click', () => {
      _triggerAnim(document.getElementById('btn-shop-freeze'), 'fx_btnPress .3s steps(3) both');
      getSocket()?.emit('freeze_shop');
    });
    document.getElementById('btn-toggle-upg-panel')?.addEventListener('click', _toggleUpgradePanel);
    document.getElementById('btn-upg-success')?.addEventListener('click', () => {
      getSocket()?.emit('upgrade_stat', { type: 'success' });
    });
    document.getElementById('btn-upg-cooldown')?.addEventListener('click', () => {
      getSocket()?.emit('upgrade_stat', { type: 'cooldown' });
    });
  }

  function _renderUpgradePanel({ successLv, successBonus, cooldownLv, cooldownMul }) {
    const sLv = document.getElementById('stat-success-lv');
    const sBonus = document.getElementById('stat-success-bonus');
    const sCost = document.getElementById('stat-success-cost');
    const sBtn = document.getElementById('btn-upg-success');
    const cdLv = document.getElementById('stat-cd-lv');
    const cdBonus = document.getElementById('stat-cd-bonus');
    const cdCost = document.getElementById('stat-cd-cost');
    const cdBtn = document.getElementById('btn-upg-cooldown');
    if (sLv) sLv.textContent = successLv;
    if (sBonus) sBonus.textContent = Math.round(successBonus * 100);
    if (sCost) sCost.textContent = Math.round(200 * Math.pow(2, successLv)) + 'c';
    if (sBtn) sBtn.disabled = successLv >= 4;
    if (cdLv) cdLv.textContent = cooldownLv;
    if (cdBonus) cdBonus.textContent = Math.round((1 - cooldownMul) * 100);
    if (cdCost) cdCost.textContent = Math.round(150 * Math.pow(2, cooldownLv)) + 'c';
    if (cdBtn) cdBtn.disabled = cooldownLv >= 4;
  }

  function _toggleUpgradePanel() {
    const title = document.getElementById('shop-panel-title');
    const toggleBtn = document.getElementById('btn-toggle-upg-panel');
    const buttonsRow = document.getElementById('shop-buttons-row');
    const cardArea = document.getElementById('shop-card-area');
    const upgradePanel = document.getElementById('shop-upgrade-panel');
    if (!_upgPanelOpen) {
      _upgPanelOpen = true;
      if (title) title.textContent = '스탯 업그레이드';
      if (toggleBtn) toggleBtn.textContent = '←';
      if (buttonsRow) {
        buttonsRow.style.animation = 'fx_panelToLeft .2s steps(4) both';
        setTimeout(() => { buttonsRow.style.display = 'none'; }, 220);
      }
      if (cardArea) {
        cardArea.style.animation = 'fx_panelToLeft .2s steps(4) both';
        setTimeout(() => {
          cardArea.style.display = 'none';
          if (upgradePanel) { upgradePanel.style.display = 'flex'; upgradePanel.style.animation = 'fx_panelFromRight .2s steps(4) both'; }
        }, 220);
      }
    } else {
      _upgPanelOpen = false;
      if (title) title.textContent = '카드 상점';
      if (toggleBtn) toggleBtn.textContent = '→';
      if (upgradePanel) {
        upgradePanel.style.animation = 'fx_panelToRight .2s steps(4) both';
        setTimeout(() => {
          upgradePanel.style.display = 'none';
          if (buttonsRow) { buttonsRow.style.display = 'flex'; buttonsRow.style.animation = 'fx_panelFromLeft .2s steps(4) both'; }
          if (cardArea) { cardArea.style.display = 'flex'; cardArea.style.animation = 'fx_panelFromLeft .2s steps(4) both'; }
        }, 220);
      }
    }
  }
  function _renderUpgBtn(upgBtn, lvl) {
    const uc = SHOP_UPGRADE_COSTS[lvl];
    upgBtn.innerHTML = uc
      ? '레벨업 ⬆<br><span style="font-size:8px;">' + uc + '코인</span>'
      : '최대 레벨';
    upgBtn.style.opacity = uc ? '1' : '.5';
    upgBtn.style.cursor = uc ? 'pointer' : 'default';
    upgBtn.style.pointerEvents = uc ? 'auto' : 'none';
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
    if (myState?.statUpgrades) {
      _statUpgrades = myState.statUpgrades;
      _renderUpgradePanel(_statUpgrades);
    }

    _syncCoins(currentCoins);

    const leftEl0 = document.getElementById('freeze-left');
    if (leftEl0 && myState?.freezeLeft !== undefined) leftEl0.textContent = myState.freezeLeft;

    const lvDisp = document.getElementById('shop-level-display');
    if (lvDisp) lvDisp.textContent = shopLevel;

    const upgBtn = document.getElementById('btn-upg-shop');
    if (upgBtn) {
      _renderUpgBtn(upgBtn, shopLevel);
      upgBtn.onclick = () => {
        if (SHOP_UPGRADE_COSTS[shopLevel] === null) return;
        _triggerAnim(upgBtn, 'fx_btnPress .3s steps(3) both');
        getSocket()?.emit('upgrade_shop');
      };
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
    _renderShelf(cards, true);  // fx_cardDeal stagger (Battle.dc.html)
    _renderHand();

  }

  let shopTimerIv = null;
  let shopTimerMax = 40;

  function _startShopTimer(seconds) {
    clearInterval(shopTimerIv);
    shopTimerMax = seconds;
    const bar = document.getElementById('shop-timer-bar');
    const txt = document.getElementById('shop-timer-text');
    if (!bar || !txt) return;
    bar.style.width = '100%';
    txt.textContent = seconds;
    let left = seconds;
    shopTimerIv = setInterval(() => {
      left--;
      txt.textContent = Math.max(0, left);
      bar.style.width = Math.max(0, (left / shopTimerMax) * 100) + '%';
      if (left <= 0) clearInterval(shopTimerIv);
    }, 1000);
  }

  function _renderShelf(cards, withDealAnim) {
    currentCards = cards ?? [];
    const shelf = document.getElementById('shop-shelf');
    if (!shelf) return;
    shelf.innerHTML = '';

    currentCards.forEach((card, i) => {
      const wrapper = document.createElement('div');
      const dealDelay = (i * 0.07).toFixed(2);
      const dealAnim = withDealAnim ? 'fx_cardDeal .4s steps(5) ' + dealDelay + 's both' : '';
      wrapper.style.cssText = 'cursor:grab;flex:none;width:136px;height:180px;' + (dealAnim ? 'animation:' + dealAnim + ';' : '');
      wrapper.title = card.name + '\n' + (card.description || '');
      wrapper.innerHTML = (typeof FX !== 'undefined') ? FX.buildCardHTML(card) : card.name;
      // 드래그로 손패에 놓으면 구매 (손패 영역이 drop zone)
      wrapper.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (typeof FX === 'undefined') return;
        const handBar = document.getElementById('shop-hand-bar');
        FX.dragCard(
          wrapper,
          (ev) => {
            if (!handBar) return false;
            const r = handBar.getBoundingClientRect();
            return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
          },
          () => getSocket()?.emit('buy_card', { cardId: card.id }),
          () => handBar
        );
      });
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

  function onBuyCardResult({ success, absorbed, leveled, coins, hand: newHand, cards, reason }) {
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
    // 서버가 보낸 갱신된 진열대 목록으로 즉시 재렌더 (구매한 카드 제거)
    if (cards !== undefined) currentCards = cards;
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

  function onUpgradeResult({ success, shopLevel: newLv, coins, cards, reason }) {
    if (!success) {
      _showToast(reason === 'INSUFFICIENT_COINS' ? '코인이 부족합니다' : '업그레이드 불가');
      return;
    }
    shopLevel = newLv;
    currentCoins = coins ?? currentCoins;
    _syncCoins(currentCoins);
    if (cards) _renderShelf(cards);
    const hcEl = document.getElementById('shop-hand-count');
    if (hcEl) hcEl.textContent = '손패 ' + (hand ? hand.length : 0) + ' / 8';
    // 레벨 표시 + 업그레이드 버튼 innerHTML 재렌더 (onShopStart와 동일 방식)
    const lvDisp = document.getElementById('shop-level-display');
    if (lvDisp) lvDisp.textContent = shopLevel;
    const upgBtn = document.getElementById('btn-upg-shop');
    if (upgBtn) _renderUpgBtn(upgBtn, shopLevel);
    // fx_lvNumPop on level number, fx_lvGlow on upgrade button (Battle.dc.html verbatim)
    _triggerAnim(lvDisp, 'fx_lvNumPop .5s steps(5) both');
    _triggerAnim(upgBtn, 'fx_lvGlow 1s steps(5) both');
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
    _renderShelf(cards, true);  // fx_cardDeal stagger (Battle.dc.html)
    // 리롤 버튼 다음 비용 표시
    const rerollCostEl = document.querySelector('#btn-shop-reroll span:last-child');
    if (rerollCostEl) rerollCostEl.textContent = nextCost + ' 코인';
    if (typeof FX !== 'undefined') FX.coinChange('minus', cost);
  }

  function onFreezeResult({ success, frozen, freezeLeft, reason }) {
    if (!success) {
      _showToast(reason === 'NO_USES' ? '얼리기 횟수를 다 사용했습니다' : '얼리기 불가');
      _triggerAnim(document.getElementById('btn-shop-freeze'), 'fx_denyShake .3s steps(4) both');
      return;
    }
    // 버튼 상태 갱신 (Battle.dc.html verbatim)
    const lbl = document.getElementById('freeze-label');
    const leftEl = document.getElementById('freeze-left');
    const btn = document.getElementById('btn-shop-freeze');
    if (lbl) lbl.textContent = frozen ? '❄ 해제' : '❄ 얼리기';
    if (leftEl) {
      leftEl.textContent = freezeLeft;
      _triggerAnim(leftEl, 'fx_freezeNumPop .5s steps(5) both');
    }
    if (btn) {
      btn.style.background = frozen ? 'linear-gradient(#6fdcd6,#2fa9a3)' : 'linear-gradient(#46c7c2,#239b96)';
    }

    // Frost overlay on shelf (Battle.dc.html frostOverlay verbatim)
    const shelf = document.getElementById('shop-shelf');
    if (shelf) {
      const prev = shelf.querySelector('.frost-overlay');
      if (frozen) {
        if (prev) prev.remove();
        const ov = document.createElement('div');
        ov.className = 'frost-overlay';
        ov.style.cssText = 'position:absolute;inset:0;z-index:8;pointer-events:none;';
        // blue tint background
        const bg = document.createElement('div');
        bg.style.cssText = 'position:absolute;inset:0;background:linear-gradient(rgba(150,225,235,.22),rgba(90,170,200,.14));box-shadow:inset 0 0 36px rgba(180,235,245,.45);border:2px solid rgba(190,240,250,.5);animation:fx_frostSpread .45s steps(4) both;';
        ov.appendChild(bg);
        // 10 crystal icons — positions & stagger from Battle.dc.html
        for (let i = 0; i < 10; i++) {
          const cr = document.createElement('div');
          const delay = (i * 0.03).toFixed(2);
          cr.style.cssText = 'position:absolute;left:' + ((6 + (i * 9.3) % 90).toFixed(1)) + '%;top:' + ((10 + (i * 31) % 78).toFixed(1)) + '%;color:#cdfaff;font-family:Galmuri7,monospace;font-size:12px;text-shadow:0 0 5px #7fe4dc;animation:fx_frostSpread .5s steps(4) ' + delay + 's both;';
          cr.textContent = '❉';
          ov.appendChild(cr);
        }
        // FROZEN label
        const lbl2 = document.createElement('div');
        lbl2.style.cssText = 'position:absolute;left:50%;top:50%;z-index:9;font-family:Galmuri11,sans-serif;font-size:22px;color:#dffaff;text-shadow:0 0 12px rgba(127,228,220,.9),2px 2px 0 #1a3a44;letter-spacing:3px;white-space:nowrap;animation:fx_frostLabel .5s steps(6) both;';
        lbl2.textContent = '❄ FROZEN ❄';
        ov.appendChild(lbl2);
        shelf.appendChild(ov);
      } else {
        // 해제: fx_frostFade로 페이드아웃
        if (prev) {
          prev.style.animation = 'fx_frostFade .4s steps(4) both';
          setTimeout(() => { if (prev.parentNode) prev.remove(); }, 450);
        }
      }
    }
  }

  function onUpgradeStatResult({ success, type, reason, successLv, successBonus, cooldownLv, cooldownMul, coins }) {
    if (!success) {
      const msgs = { MAX_LEVEL: '이미 최대 등급', INSUFFICIENT_COINS: '코인 부족' };
      _showToast(msgs[reason] || '업그레이드 불가');
      return;
    }
    _syncCoins(coins);
    _statUpgrades = { successLv, successBonus, cooldownLv, cooldownMul };
    _renderUpgradePanel(_statUpgrades);
    if (typeof FX !== 'undefined') FX.coinChange('minus', 0);
  }

  return { init, onShopStart, onBuyCardResult, onSellHandCardResult, onHandUpdate, onUpgradeResult, onRerollResult, onFreezeResult, onUpgradeStatResult };
})();