/* fx.js — animation triggers (design-reference verbatim timing/style, vanilla DOM)
 * FX 모션/타이밍/스타일은 design-reference의 React 코드에서 그대로 포팅.
 * 트리거 연결 (어떤 게임 이벤트에서 발동) 부분만 새로 작성. */
const FX = (() => {

  // ── helper ────────────────────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  function mkDiv(styles, parent, ms) {
    const d = document.createElement('div');
    Object.assign(d.style, styles);
    (parent || document.body).appendChild(d);
    if (ms) setTimeout(() => d.remove(), ms);
    return d;
  }

  // anchor: element to position relative to, or falls back to sword-art center
  function anchorCenter(anchorEl) {
    if (!anchorEl) anchorEl = el('my-sword-art') || el('game-root');
    const r = anchorEl.getBoundingClientRect();
    const root = el('game-root');
    const rr = root ? root.getBoundingClientRect() : { left: 0, top: 0 };
    const scale = root ? (parseFloat(root.style.transform.replace('scale(', '')) || 1) : 1;
    return {
      x: (r.left + r.width / 2 - rr.left) / scale,
      y: (r.top + r.height / 2 - rr.top) / scale
    };
  }

  function layer(zIndex, parent) {
    return mkDiv({
      position: 'absolute', inset: '0', zIndex: String(zIndex || 20),
      pointerEvents: 'none', overflow: 'hidden'
    }, parent || el('game-root'));
  }

  // ── FX01 강화성공 (design-reference verbatim timing) ──────────────────────
  // tier: ≤2 combo → tier1, ≤5 → tier2, >5 → tier3
  function success(combo) {
    const tier = combo <= 2 ? 1 : combo <= 5 ? 2 : 3;
    const anchor = el('my-sword-art');
    const { x, y } = anchorCenter(anchor);
    const root = el('game-root');
    if (!root) return;

    const lyr = layer(22, root);

    // sparks (same structure as FX01)
    const count = tier === 1 ? 10 : tier === 2 ? 16 : 24;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count;
      const d = (tier === 3 ? 90 : 50) + (i % 4) * 16;
      const p = document.createElement('div');
      p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${3 + (i % 3)}px;height:${3 + (i % 3)}px;background:${tier >= 2 ? '#fff2c8' : '#ffbe5c'};box-shadow:0 0 6px #ff7a2a;--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d - 10}px;animation:fx_spark ${0.36 + (i % 3) * 0.08}s steps(5) both;`;
      lyr.appendChild(p);
    }

    // ring
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:60px;height:60px;margin-left:-30px;margin-top:-30px;border:3px solid ${tier >= 2 ? '#ffd24d' : '#ffbe5c'};animation:fx_ring .45s steps(6) both;`;
    lyr.appendChild(ring);

    // flash
    const flash = document.createElement('div');
    flash.style.cssText = `position:absolute;inset:0;background:radial-gradient(circle at ${x}px ${y}px,rgba(255,230,150,.${tier >= 2 ? '8' : '6'}),transparent 40%);animation:fx_flash .4s steps(5) both;`;
    lyr.appendChild(flash);

    // tier3: pillar + shake
    if (tier >= 3) {
      const pillar = document.createElement('div');
      pillar.style.cssText = `position:absolute;left:${x}px;top:${y - 200}px;width:60px;height:200px;background:linear-gradient(transparent,rgba(255,210,80,.7));transform-origin:50% 100%;transform:translateX(-50%);animation:fx_pillar .6s steps(8) both;`;
      lyr.appendChild(pillar);
      if (anchor) { anchor.style.animation = 'fx_shakeL .4s steps(6)'; setTimeout(() => { anchor.style.animation = ''; }, 450); }
    } else if (tier === 2) {
      if (anchor) { anchor.style.animation = 'fx_shakeM .35s steps(5)'; setTimeout(() => { anchor.style.animation = ''; }, 400); }
    } else {
      if (anchor) { anchor.style.animation = 'fx_shakeS .3s steps(4)'; setTimeout(() => { anchor.style.animation = ''; }, 350); }
    }

    // combo badge
    if (combo > 0) {
      const badge = document.createElement('div');
      badge.style.cssText = `position:absolute;left:${x}px;top:${y - 40}px;font-family:Galmuri11,sans-serif;font-size:18px;color:#ffd76a;text-shadow:2px 2px 0 #000;animation:fx_badge .9s steps(8) both;pointer-events:none;`;
      badge.textContent = `COMBO ×${combo}`;
      lyr.appendChild(badge);
    }

    setTimeout(() => lyr.remove(), 1200);
  }

  // ── FX02 강화실패 (design-reference verbatim) ──────────────────────────────
  function fail() {
    const anchor = el('my-sword-art');
    const { x, y } = anchorCenter(anchor);
    const root = el('game-root');
    if (!root) return;

    const lyr = layer(22, root);

    // red flash
    const flash = document.createElement('div');
    flash.style.cssText = `position:absolute;inset:0;background:rgba(200,50,30,.45);animation:fx_redflash .5s steps(5) both;`;
    lyr.appendChild(flash);

    // shards (14 pieces — FX02 design verbatim)
    for (let i = 0; i < 14; i++) {
      const ang = (Math.PI * 2 * i) / 14 + (Math.random() * 0.3);
      const d = 60 + Math.random() * 80;
      const shard = document.createElement('div');
      const dx = Math.cos(ang) * d;
      const dy = Math.sin(ang) * d;
      const rot = (Math.random() * 720 - 360);
      shard.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${5 + (i % 4)}px;height:${5 + (i % 3)}px;background:${i % 3 === 0 ? '#ff9a3c' : '#8a8f9a'};--dx:${dx}px;--dy:${dy}px;--rot:${rot}deg;animation:fx_shatter ${0.6 + Math.random() * 0.3}s steps(8) both;`;
      lyr.appendChild(shard);
    }

    // BROKEN banner
    const broken = document.createElement('div');
    broken.style.cssText = `position:absolute;left:${x}px;top:${y - 20}px;transform:translate(-50%,-50%);font-family:Galmuri11,sans-serif;font-size:36px;color:#e8342a;text-shadow:3px 3px 0 #000,0 0 18px rgba(232,52,42,.6);letter-spacing:4px;animation:fx_brokenIn 1.4s steps(10) both;`;
    broken.textContent = 'BROKEN';
    lyr.appendChild(broken);

    // shake sword container
    if (anchor) {
      anchor.style.animation = 'fx_shakeL .5s steps(7)';
      setTimeout(() => { anchor.style.animation = ''; }, 550);
    }

    setTimeout(() => lyr.remove(), 1800);
  }

  // ── FX07 교전 (design-reference _genSchedule verbatim) ────────────────────
  function _genSchedule(N, meDurInit, oppDurInit) {
    const meDur = meDurInit, oppDur = oppDurInit;
    const dmgPerHit = { me: meDur / N, opp: oppDur / N };

    // decide winner (whichever runs out last survives with more)
    // the server tells us via hits array; we just animate what it says
    const hits = [];
    let me = meDur, opp = oppDur;
    const open = Math.min(3, N);
    const finish = 1;
    const montage = N - open - finish;

    for (let i = 0; i < N; i++) {
      const phase = i < open ? 'open' : i < open + montage ? 'montage' : 'finish';
      const isLast = i === N - 1;
      const per = isLast ? 340 : phase === 'open' ? 250 : 160;
      hits.push({
        def: i % 2 === 0 ? 'me' : 'opp',
        dmg: i % 2 === 0 ? dmgPerHit.me : dmgPerHit.opp,
        crit: i > N * 0.6,
        phase, isLast, per
      });
    }
    return hits;
  }

  async function combat(serverHits, myInitDur, oppInitDur, damageTaken, finalMyHp, finalOppHp, updateHpCb, flashCb) {
    const root = el('game-root');
    const engLyr = el('engage-layer');
    if (!root || !engLyr) return;

    const N = serverHits ? serverHits.length : 8;
    const schedule = serverHits && serverHits.length > 0
      ? serverHits.map((h, i) => {
          const open = Math.min(3, N), finish = 1, montage = N - open - finish;
          const phase = i < open ? 'open' : i < open + montage ? 'montage' : 'finish';
          return { ...h, phase, isLast: i === N - 1, per: i === N - 1 ? 340 : phase === 'open' ? 250 : 160 };
        })
      : _genSchedule(N, myInitDur || 100, oppInitDur || 100);

    const meSword = el('my-sword-art');
    const oppSword = el('opp-sword-art');

    // dim overlay (FX07 verbatim)
    const dim = mkDiv({
      position: 'absolute', inset: '0', background: 'rgba(0,0,0,.55)',
      zIndex: '14', animation: 'fx_engDim .3s steps(4) both'
    }, root);

    let meDur = myInitDur || 100;
    let oppDur = oppInitDur || 100;

    let t = 0;
    const timers = [];
    schedule.forEach((hit, i) => {
      timers.push(setTimeout(() => {
        // jolt struck side
        const struckEl = hit.def === 'me' ? meSword : oppSword;
        const joltAnim = hit.def === 'me' ? 'fx_joltL .18s steps(3)' : 'fx_joltR .18s steps(3)';
        if (struckEl) {
          struckEl.style.animation = joltAnim;
          setTimeout(() => { struckEl.style.animation = ''; }, 200);
        }

        // reduce DUR
        if (hit.def === 'me') { meDur = Math.max(0, meDur - (hit.dmg || 12)); }
        else { oppDur = Math.max(0, oppDur - (hit.dmg || 12)); }

        // update DUR bars
        const myDurBar = el('my-dur-bar');
        const oppDurBar = el('opp-dur-bar');
        if (myDurBar) myDurBar.style.width = Math.max(0, meDur) + '%';
        if (oppDurBar) oppDurBar.style.width = Math.max(0, oppDur) + '%';

        // spark burst (design-reference verbatim positioning)
        const sideX = hit.def === 'me' ? '28%' : '72%';
        const count = hit.isLast ? 26 : hit.crit ? 16 : 10;
        for (let j = 0; j < count; j++) {
          const ang = (Math.PI * 2 * j) / count;
          const d = (hit.isLast ? 90 : 50) + (j % 4) * 16;
          const sp = document.createElement('div');
          sp.style.cssText = `position:absolute;left:${sideX};top:44%;width:${3 + (j % 3)}px;height:${3 + (j % 3)}px;background:${hit.crit || hit.isLast ? '#fff2c8' : '#ffbe5c'};box-shadow:0 0 6px #ff7a2a;--dx:${Math.cos(ang) * d}px;--dy:${Math.sin(ang) * d - 10}px;animation:fx_spark ${0.32 + (j % 3) * 0.06}s steps(5) both;`;
          engLyr.appendChild(sp);
          setTimeout(() => sp.remove(), 600);
        }

        // clash
        const clash = document.createElement('div');
        clash.style.cssText = `position:absolute;left:${sideX};top:44%;width:40px;height:40px;margin-left:-20px;margin-top:-20px;border-radius:50%;background:radial-gradient(circle,rgba(255,230,150,.9),transparent 65%);animation:fx_clash .3s steps(4) both;`;
        engLyr.appendChild(clash);
        setTimeout(() => clash.remove(), 400);

        // streak in montage/finish phase
        if (hit.phase !== 'open') {
          const streak = document.createElement('div');
          streak.style.cssText = `position:absolute;left:${hit.def === 'me' ? '8%' : '52%'};top:${30 + (i % 5) * 8}%;width:40%;height:3px;background:linear-gradient(90deg,transparent,#ffbe5c,transparent);transform-origin:${hit.def === 'me' ? 'left' : 'right'};animation:fx_streak .22s steps(3) both;`;
          engLyr.appendChild(streak);
          setTimeout(() => streak.remove(), 300);
        }

        // finish flash
        if (hit.isLast) {
          const ff = document.createElement('div');
          ff.style.cssText = `position:absolute;inset:0;background:radial-gradient(circle at ${sideX} 44%,rgba(255,200,110,.85),transparent 55%);animation:fx_flash .5s steps(6) both;`;
          engLyr.appendChild(ff);
          setTimeout(() => ff.remove(), 600);
        }
      }, t));
      t += hit.per;
    });

    // wait for all hits + result banner
    await new Promise(resolve => setTimeout(resolve, t + 200));

    // determine winner based on DUR
    const winner = meDur > 0 ? 'me' : 'opp';

    // result banner (FX07 verbatim)
    const result = document.createElement('div');
    result.style.cssText = `position:absolute;left:50%;top:34%;z-index:9;font-family:Galmuri11,sans-serif;font-size:44px;color:${winner === 'me' ? '#ffd76a' : '#cfd2db'};text-shadow:${winner === 'me' ? '0 0 16px rgba(245,170,60,.7),3px 3px 0 #000' : '3px 3px 0 #000'};letter-spacing:3px;white-space:nowrap;animation:fx_resultIn .6s steps(7) both;transform:translate(-50%,-50%);`;
    result.textContent = winner === 'me' ? 'WIN!' : 'LOSE';
    engLyr.appendChild(result);

    // winGlow on winner sword
    const winSword = winner === 'me' ? meSword : oppSword;
    if (winSword) winSword.style.animation = 'fx_winGlow 1.2s ease-in-out infinite,swordPulse 2.6s ease-in-out infinite';

    // update HP after combat
    if (updateHpCb) updateHpCb(finalMyHp, finalOppHp);
    if (damageTaken > 0 && flashCb) flashCb(`-${Math.round(damageTaken)} HP`);

    await new Promise(resolve => setTimeout(resolve, 1400));

    // cleanup
    timers.forEach(clearTimeout);
    dim.remove();
    engLyr.innerHTML = '';
    if (meSword) meSword.style.animation = 'swordPulse 2.6s ease-in-out infinite';
    if (oppSword) oppSword.style.animation = '';
  }

  // ── FX03 코인 변화 ─────────────────────────────────────────────────────────
  function coinChange(dir, amount) {
    const coinEl = el('my-coins');
    if (!coinEl) return;
    if (dir === 'deny') {
      coinEl.style.animation = 'fx_denyShake .3s steps(4)';
      setTimeout(() => { coinEl.style.animation = ''; }, 350);
      return;
    }
    // float label
    const root = el('game-root');
    if (!root) return;
    const r = coinEl.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const scale = parseFloat(root.style.transform.replace('scale(', '')) || 1;
    const cx = (r.left + r.width / 2 - rr.left) / scale;
    const cy = (r.top - rr.top) / scale;
    const lbl = document.createElement('div');
    lbl.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;font-family:Galmuri11,sans-serif;font-size:16px;color:${dir === 'plus' ? '#7fe47c' : '#e87a72'};text-shadow:1px 1px 0 #000;pointer-events:none;transform:translateX(-50%);animation:fx_floatUp .9s steps(7) both;z-index:30;`;
    lbl.textContent = `${dir === 'plus' ? '+' : '-'}${Math.round(amount)}`;
    root.appendChild(lbl);
    setTimeout(() => lbl.remove(), 950);

    // pop coin display
    coinEl.style.animation = 'fx_coinPop .3s steps(4)';
    setTimeout(() => { coinEl.style.animation = ''; }, 350);
  }

  // ── FX04 판매 ────────────────────────────────────────────────────────────
  function sell(gained) {
    const anchor = el('my-sword-art');
    if (!anchor) return;
    // stamp effect
    const root = el('game-root');
    if (!root) return;
    const { x, y } = anchorCenter(anchor);
    const stamp = document.createElement('div');
    stamp.style.cssText = `position:absolute;left:${x}px;top:${y}px;transform:translate(-50%,-50%) scale(2.6) rotate(-12deg);font-family:Galmuri11,sans-serif;font-size:28px;color:#4a8fd0;text-shadow:3px 3px 0 #000;letter-spacing:2px;animation:fx_stamp 1.1s steps(9) both;z-index:25;pointer-events:none;`;
    stamp.textContent = 'SOLD!';
    root.appendChild(stamp);
    setTimeout(() => stamp.remove(), 1200);
    if (gained > 0) coinChange('plus', gained);
  }

  // ── FX05 라운드 시작 ─────────────────────────────────────────────────────
  function roundStart(round) {
    const root = el('game-root');
    if (!root) return;
    const lyr = layer(25, root);
    // dim
    const dim = mkDiv({ position: 'absolute', inset: '0', background: 'rgba(0,0,0,.55)', animation: 'fx_dim .8s steps(5) both' }, lyr);
    // round number
    const label = document.createElement('div');
    label.style.cssText = `position:absolute;left:50%;top:50%;font-family:Galmuri11,sans-serif;font-size:56px;color:#ffd76a;text-shadow:0 0 24px rgba(245,170,60,.6),3px 4px 0 #000;letter-spacing:4px;animation:fx_countIn .9s steps(8) both;transform:translate(-50%,-50%);`;
    label.textContent = `ROUND ${round}`;
    lyr.appendChild(label);
    setTimeout(() => lyr.remove(), 1200);
  }

  // ── FX06 상점 오픈 ───────────────────────────────────────────────────────
  function shopOpen() {
    const root = el('game-root');
    if (!root) return;
    const lyr = layer(25, root);
    const dim = mkDiv({ position: 'absolute', inset: '0', background: 'rgba(0,0,0,.45)', animation: 'fx_dim .5s steps(4) both' }, lyr);
    const label = document.createElement('div');
    label.style.cssText = `position:absolute;left:50%;top:50%;font-family:Galmuri11,sans-serif;font-size:44px;color:#ffd76a;text-shadow:0 0 18px rgba(245,170,60,.6),2px 3px 0 #000;letter-spacing:3px;animation:fx_dropIn .45s steps(7) both;transform:translate(-50%,-50%);`;
    label.textContent = '✦ 카드 상점 ✦';
    lyr.appendChild(label);
    setTimeout(() => lyr.remove(), 900);
  }

  // ── FX08 7성 카드 등장 ────────────────────────────────────────────────────
  function sevenStarReveal(cardEl) {
    if (!cardEl) return;
    cardEl.style.animation = 'ec_glow .4s steps(5)';
    setTimeout(() => { cardEl.style.animation = ''; }, 500);
    const root = el('game-root');
    if (!root) return;
    const r = cardEl.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    const scale = parseFloat(root.style.transform.replace('scale(', '')) || 1;
    const cx = (r.left + r.width / 2 - rr.left) / scale;
    const cy = (r.top + r.height / 2 - rr.top) / scale;
    const flash = document.createElement('div');
    flash.style.cssText = `position:absolute;left:${cx}px;top:${cy}px;width:80px;height:80px;margin-left:-40px;margin-top:-40px;border-radius:50%;background:radial-gradient(circle,rgba(255,216,77,.9),transparent 65%);animation:fx_clash .5s steps(6) both;z-index:25;pointer-events:none;`;
    root.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  }

  // ── FX09 카드 레벨업 ──────────────────────────────────────────────────────
  function cardLevelUp(anchorEl) {
    const root = el('game-root');
    if (!root || !anchorEl) return;
    const { x, y } = anchorCenter(anchorEl);
    const lyr = layer(25, root);
    // ring pop
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:60px;height:60px;margin-left:-30px;margin-top:-30px;border:3px solid #ffd24d;border-radius:2px;animation:fx_ringPop .5s steps(6) both;`;
    lyr.appendChild(ring);
    // lv burst label
    const lbl = document.createElement('div');
    lbl.style.cssText = `position:absolute;left:${x}px;top:${y}px;font-family:Galmuri11,sans-serif;font-size:22px;color:#ffd76a;text-shadow:2px 2px 0 #000;animation:fx_lvBurst .7s steps(7) both;transform:translate(-50%,-50%);`;
    lbl.textContent = 'LV UP!';
    lyr.appendChild(lbl);
    setTimeout(() => lyr.remove(), 900);
  }

  // ── FX11 HP 경고 ──────────────────────────────────────────────────────────
  let _hpWarnInterval = null;
  function hpWarning(active, hp) {
    const myHpBar = el('my-hp-bar');
    if (active) {
      if (!_hpWarnInterval) {
        _hpWarnInterval = setInterval(() => {
          if (myHpBar) {
            myHpBar.style.animation = 'fx_barPulse .6s steps(5) infinite';
          }
        }, 100);
        if (myHpBar) myHpBar.style.animation = 'fx_barPulse .6s steps(5) infinite';
      }
    } else {
      if (_hpWarnInterval) {
        clearInterval(_hpWarnInterval);
        _hpWarnInterval = null;
      }
      if (myHpBar) myHpBar.style.animation = '';
    }
  }

  return { success, fail, coinChange, sell, roundStart, shopOpen, combat, sevenStarReveal, cardLevelUp, hpWarning };
})();
