/* fx.js — FX 애니메이션 모듈
 * design-reference/FX 01~15 및 카드레벨업 파일의 로직을 vanilla JS로 포팅
 * server/는 건드리지 않음. socket.io 이벤트 스펙 그대로 유지.
 */
const FX = (() => {

  // ── 공통 헬퍼 ───────────────────────────────────────────────────────────
  function _wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function _getSwordPos(id) {
    const el = document.getElementById(id);
    if (!el) return { x: window.innerWidth / 2, y: window.innerHeight * 0.45 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function _spawnParticle(x, y, ang, dist, sz, color, animName, dur, delay) {
    const p = document.createElement('div');
    p.style.cssText =
      `position:fixed;left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;` +
      `background:${color};box-shadow:0 0 5px ${color};` +
      `--dx:${(Math.cos(ang) * dist).toFixed(1)}px;--dy:${(Math.sin(ang) * dist).toFixed(1)}px;` +
      `animation:${animName} ${dur.toFixed(2)}s steps(6) ${delay.toFixed(2)}s both;` +
      `pointer-events:none;z-index:9001;`;
    document.body.appendChild(p);
    p.addEventListener('animationend', () => p.remove(), { once: true });
    return p;
  }

  function _overlay(bgStyle, animStyle, zIndex = 9002) {
    const el = document.createElement('div');
    el.style.cssText =
      `position:fixed;inset:0;pointer-events:none;z-index:${zIndex};` +
      `background:${bgStyle};animation:${animStyle};`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    return el;
  }

  function _shakeArena(cls) {
    const arena = document.querySelector('.game-arena');
    if (!arena) return;
    arena.classList.remove('shake-sm', 'shake-lg');
    void arena.offsetWidth;
    arena.classList.add(cls);
    arena.addEventListener('animationend', () => arena.classList.remove(cls), { once: true });
  }

  // ── FX01: 강화 성공 ─────────────────────────────────────────────────────
  function success(combo) {
    const tier = combo <= 2 ? 1 : combo <= 5 ? 2 : 3;
    const count = tier === 1 ? 7 : tier === 2 ? 13 : 22;
    const colors = tier === 3
      ? ['#fff2c8', '#ffbe5c', '#ff8a3c']
      : tier === 2 ? ['#ffbe5c', '#ffd76a', '#fff2c8']
      : ['#ffd76a', '#f0c040'];
    const { x, y } = _getSwordPos('my-sword-art');

    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (i % 2) * 0.3;
      const dist = 40 + (i % 4) * 22 + tier * 14;
      _spawnParticle(x, y, ang, dist, 2 + (i % 3), colors[i % colors.length], 'fx_spark', 0.42 + (i % 4) * 0.06, 0.14);
    }

    _shakeArena(tier >= 3 ? 'shake-lg' : 'shake-sm');

    const tCol = tier === 3 ? 'rgba(255,205,115,' : tier === 2 ? 'rgba(255,185,95,' : 'rgba(255,165,75,';
    _overlay(
      `radial-gradient(circle at ${x}px ${y}px,${tCol}.5),transparent 55%)`,
      'fx_flash .4s steps(5) .14s both'
    );

    if (tier >= 2) {
      const ring = document.createElement('div');
      ring.style.cssText =
        `position:fixed;left:${x - 35}px;top:${y - 35}px;width:70px;height:70px;` +
        `border:4px solid ${tier === 3 ? '#ffd24d' : '#ffbe5c'};border-radius:2px;` +
        `box-shadow:0 0 12px ${tier === 3 ? '#ffd24d' : '#ffbe5c'};` +
        `pointer-events:none;z-index:9001;animation:fx_ring .55s steps(6) .28s both;`;
      document.body.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove(), { once: true });
    }

    if (tier === 3) {
      const pillar = document.createElement('div');
      pillar.style.cssText =
        `position:fixed;left:${x - 35}px;bottom:0;width:70px;height:320px;` +
        `background:linear-gradient(rgba(255,220,120,.85),rgba(255,140,50,.5) 50%,transparent);` +
        `pointer-events:none;z-index:9001;transform-origin:bottom center;` +
        `animation:fx_pillar .6s steps(7) .28s both;`;
      document.body.appendChild(pillar);
      pillar.addEventListener('animationend', () => pillar.remove(), { once: true });
    }

    const accent = tier === 3 ? '#ffd24d' : '#ffbe5c';
    const badge = document.createElement('div');
    badge.textContent = `콤보${combo}!`;
    badge.style.cssText =
      `position:fixed;left:${x}px;top:${y - 40}px;z-index:9003;pointer-events:none;` +
      `font-family:'Galmuri11',sans-serif;font-size:${tier === 3 ? 32 : tier === 2 ? 24 : 18}px;` +
      `color:${tier === 3 ? 'transparent' : accent};` +
      (tier === 3
        ? `background:linear-gradient(90deg,#ff5e5e,#ffbe4d,#7dff8a,#4dd2ff,#a97bff,#ff5ec8,#ff5e5e);` +
          `background-size:200% 100%;-webkit-background-clip:text;background-clip:text;`
        : '') +
      `text-shadow:2px 2px 0 #000;white-space:nowrap;` +
      `animation:fx_badge .9s steps(8) .28s both;`;
    document.body.appendChild(badge);
    badge.addEventListener('animationend', () => badge.remove(), { once: true });

    const flt = document.createElement('div');
    flt.textContent = '+1 단계';
    flt.style.cssText =
      `position:fixed;left:${x}px;top:${y + 20}px;z-index:9003;pointer-events:none;` +
      `font-family:'Galmuri7',monospace;font-size:13px;color:#8be89c;text-shadow:1px 1px 0 #000;` +
      `white-space:nowrap;animation:fx_float 1s steps(6) .3s both;`;
    document.body.appendChild(flt);
    flt.addEventListener('animationend', () => flt.remove(), { once: true });
  }

  // ── FX02: 강화 실패 ─────────────────────────────────────────────────────
  function fail() {
    const { x, y } = _getSwordPos('my-sword-art');

    _overlay(
      `radial-gradient(circle at ${x}px ${y}px,rgba(232,70,63,.7),transparent 60%)`,
      'fx_redflash .4s steps(4) .44s both'
    );

    for (let i = 0; i < 14; i++) {
      const dx = (Math.random() * 2 - 1) * 180;
      const dy = (Math.random() * 2 - 1) * 150 + 30;
      const rot = (Math.random() * 2 - 1) * 540;
      const sz = 4 + Math.floor(Math.random() * 7);
      const cold = i % 3;
      const p = document.createElement('div');
      p.style.cssText =
        `position:fixed;left:${x}px;top:${y}px;width:${sz}px;height:${sz + Math.floor(Math.random() * 4)}px;` +
        `background:${cold === 0 ? '#ff9a3c' : cold === 1 ? '#c9a98e' : '#8a8f9a'};` +
        `--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;--rot:${rot.toFixed(0)}deg;` +
        `pointer-events:none;z-index:9001;` +
        `animation:fx_shatter ${(0.6 + Math.random() * 0.3).toFixed(2)}s steps(8) .48s both;`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }

    const broken = document.createElement('div');
    broken.textContent = 'BROKEN';
    broken.style.cssText =
      `position:fixed;left:${x}px;top:${y}px;z-index:9003;pointer-events:none;` +
      `font-family:'Galmuri11',sans-serif;font-size:38px;color:#e8554c;` +
      `text-shadow:0 0 12px rgba(232,70,63,.6),2px 2px 0 #000;letter-spacing:2px;` +
      `white-space:nowrap;animation:fx_brokenIn 1.4s steps(10) .56s both;`;
    document.body.appendChild(broken);
    broken.addEventListener('animationend', () => broken.remove(), { once: true });

    _shakeArena('shake-lg');
  }

  // ── FX03: 코인 변화 ─────────────────────────────────────────────────────
  // mode: 'plus' | 'minus' | 'deny'
  function coinChange(mode, amount, anchorId) {
    const coinsEl = document.getElementById(anchorId || 'my-coins');
    const r = coinsEl ? coinsEl.getBoundingClientRect() : null;
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r ? r.top + r.height / 2 : window.innerHeight / 2;

    if (mode === 'deny') {
      const el = document.createElement('div');
      el.textContent = '잔액 부족!';
      el.style.cssText =
        `position:fixed;left:${x}px;top:${y - 30}px;z-index:9003;pointer-events:none;` +
        `font-family:'Galmuri11',sans-serif;font-size:22px;color:#e8554c;` +
        `text-shadow:0 0 8px rgba(232,70,63,.6),1px 1px 0 #000;white-space:nowrap;` +
        `animation:fx_denyShake .4s steps(5) both;`;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
      return;
    }

    const isPlus = mode === 'plus';
    const flt = document.createElement('div');
    flt.textContent = (isPlus ? '+' : '-') + Math.floor(amount);
    flt.style.cssText =
      `position:fixed;left:${x}px;top:${isPlus ? y - 30 : y}px;z-index:9003;pointer-events:none;` +
      `font-family:'Galmuri11',sans-serif;font-size:26px;` +
      `color:${isPlus ? '#8be89c' : '#e88a82'};` +
      `text-shadow:0 0 8px ${isPlus ? 'rgba(80,220,120,.5)' : 'rgba(232,120,110,.4)'},2px 2px 0 #000;` +
      `white-space:nowrap;animation:${isPlus ? 'fx_floatUp' : 'fx_floatDown'} 1s steps(6) both;`;
    document.body.appendChild(flt);
    flt.addEventListener('animationend', () => flt.remove(), { once: true });

    if (isPlus) {
      for (let i = 0; i < 9; i++) {
        const ang = (Math.PI * 2 * i) / 9;
        const d = 60 + (i % 3) * 18;
        const p = document.createElement('div');
        p.style.cssText =
          `position:fixed;left:${x}px;top:${y}px;width:4px;height:4px;` +
          `background:${i % 2 ? '#fff2c8' : '#ffd76a'};box-shadow:0 0 6px #ffcf5a;` +
          `--dx:${(Math.cos(ang) * d).toFixed(1)}px;--dy:${(Math.sin(ang) * d).toFixed(1)}px;` +
          `pointer-events:none;z-index:9001;` +
          `animation:fx_sparkle ${(0.5 + (i % 3) * 0.08).toFixed(2)}s steps(6) both;`;
        document.body.appendChild(p);
        p.addEventListener('animationend', () => p.remove(), { once: true });
      }
    }
  }

  // ── FX04: 판매 ──────────────────────────────────────────────────────────
  function sell(amount) {
    const { x, y } = _getSwordPos('my-sword-art');

    const stamp = document.createElement('div');
    stamp.textContent = `SOLD +${Math.floor(amount)}`;
    stamp.style.cssText =
      `position:fixed;left:${x}px;top:${y}px;z-index:9003;pointer-events:none;` +
      `font-family:'Galmuri11',sans-serif;font-size:26px;color:#6f9fd6;` +
      `border:4px solid #6f9fd6;padding:6px 16px;` +
      `box-shadow:0 0 12px rgba(111,159,214,.5);text-shadow:2px 2px 0 #000;white-space:nowrap;` +
      `animation:fx_stamp 1.6s steps(10) .5s both;`;
    document.body.appendChild(stamp);
    stamp.addEventListener('animationend', () => stamp.remove(), { once: true });

    const coinsEl = document.getElementById('my-coins');
    const cr = coinsEl ? coinsEl.getBoundingClientRect() : { left: x, top: y + 60 };
    for (let i = 0; i < 10; i++) {
      const sx = (Math.random() * 2 - 1) * 30;
      const dx = (cr.left - x) + (Math.random() * 2 - 1) * 40;
      const dy = (cr.top - y) + 20;
      const sz = 10 + Math.floor(Math.random() * 8);
      const p = document.createElement('div');
      p.style.cssText =
        `position:fixed;left:${x + sx}px;top:${y}px;width:${sz}px;height:${sz}px;` +
        `border-radius:50%;` +
        `background:radial-gradient(circle at 36% 30%,#ffe79a,#f0c44a 45%,#b8761f);` +
        `border:2px solid #6e4a10;--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;` +
        `pointer-events:none;z-index:9001;` +
        `animation:fx_fly ${(0.5 + Math.random() * 0.25).toFixed(2)}s steps(7) ${(0.55 + i * 0.025).toFixed(2)}s both;`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  // ── FX05: 라운드 시작 ───────────────────────────────────────────────────
  function roundStart(round) {
    const rn = String(round).padStart(2, '0');
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const dim = document.createElement('div');
    dim.style.cssText =
      `position:fixed;inset:0;background:#000;z-index:8000;pointer-events:none;` +
      `animation:fx_dim 1.6s steps(10) both;`;
    document.body.appendChild(dim);
    dim.addEventListener('animationend', () => dim.remove(), { once: true });

    const label = document.createElement('div');
    label.textContent = 'R O U N D';
    label.style.cssText =
      `position:fixed;left:${cx}px;top:${cy * 0.62}px;z-index:8001;pointer-events:none;` +
      `font-family:'Galmuri7',monospace;font-size:13px;color:#5fd6c4;` +
      `text-shadow:1px 1px 0 #000;white-space:nowrap;letter-spacing:6px;` +
      `animation:fx_labelIn .5s steps(5) .2s both;`;
    document.body.appendChild(label);
    label.addEventListener('animationend', () => label.remove(), { once: true });

    const num = document.createElement('div');
    num.textContent = rn;
    num.style.cssText =
      `position:fixed;left:${cx}px;top:${cy * 0.78}px;z-index:8001;pointer-events:none;` +
      `font-family:'Galmuri11',sans-serif;font-size:110px;color:#ffd76a;` +
      `text-shadow:0 0 18px rgba(245,170,60,.6),3px 4px 0 #000;` +
      `animation:fx_roundIn 1.5s steps(11) .2s both;`;
    document.body.appendChild(num);
    num.addEventListener('animationend', () => num.remove(), { once: true });

    _overlay(
      `radial-gradient(circle at ${cx}px ${cy}px,rgba(255,210,120,.9),transparent 60%)`,
      'fx_flash .5s steps(5) .42s both',
      8001
    );

    for (let i = 0; i < 14; i++) {
      const ang = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.2;
      const d = 80 + Math.random() * 120;
      const sz = 3 + (i % 2);
      const p = document.createElement('div');
      p.style.cssText =
        `position:fixed;left:${cx}px;top:${cy * 0.9}px;width:${sz}px;height:${sz}px;` +
        `background:${i % 2 ? '#ffbe5c' : '#ff9a3c'};box-shadow:0 0 6px #ff7a2a;` +
        `--dx:${(Math.cos(ang) * d).toFixed(1)}px;--dy:${(Math.sin(ang) * d).toFixed(1)}px;` +
        `pointer-events:none;z-index:8001;` +
        `animation:fx_emberBurst ${(0.7 + Math.random() * 0.5).toFixed(2)}s steps(7) ${(0.2 + Math.random() * 0.2).toFixed(2)}s both;`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  // ── FX06: 상점 오픈 ─────────────────────────────────────────────────────
  function shopOpen() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.3;
    _overlay(
      `radial-gradient(circle at ${cx}px ${cy}px,rgba(245,170,60,.35),transparent 60%)`,
      'fx_flash .5s steps(5) both',
      8000
    );
  }

  // ── FX07: 교전 ──────────────────────────────────────────────────────────
  // hits: [{ myDurAfter, oppDurAfter }], updateHpFn: (myHp, oppHp) => void
  async function combat(hits, myInitDur, oppInitDur, damageTaken, myHp, oppHp, updateHpFn, flashDamageFn) {
    const mySword  = document.getElementById('my-sword-art');
    const oppSword = document.getElementById('opp-sword-art');
    const myDurBar  = document.getElementById('my-dur-bar');
    const oppDurBar = document.getElementById('opp-dur-bar');

    function setDurBar(bar, cur, init) {
      if (!bar || !init) return;
      const pct = Math.max(0, (cur / init) * 100);
      bar.style.cssText =
        `position:absolute;left:0;top:0;bottom:0;width:${pct}%;` +
        `background:${pct > 50 ? 'linear-gradient(#e2e8f0,#9aa3b3)' : pct > 25 ? 'linear-gradient(#f5b73a,#c2862a)' : 'linear-gradient(#e8554c,#b8302a)'};` +
        `box-shadow:inset 0 1px 0 rgba(255,255,255,.4);transition:width .14s steps(4);`;
    }

    function jolt(sword, side) {
      if (!sword) return;
      const cls = side === 'me' ? 'fx-jolt-l' : 'fx-jolt-r';
      sword.classList.remove('fx-jolt-l', 'fx-jolt-r');
      void sword.offsetWidth;
      sword.classList.add(cls);
      sword.addEventListener('animationend', () => sword.classList.remove(cls), { once: true });
    }

    function spawnSparks(side, isCrit, isLast, hitIdx) {
      const tgt = document.getElementById(side === 'me' ? 'my-sword-art' : 'opp-sword-art');
      if (!tgt) return;
      const r = tgt.getBoundingClientRect();
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      const count = isLast ? 26 : isCrit ? 16 : 10;

      for (let i = 0; i < count; i++) {
        const ang = (Math.PI * 2 * i) / count;
        const d = (isLast ? 90 : 50) + (i % 4) * 16;
        const p = document.createElement('div');
        p.style.cssText =
          `position:fixed;left:${sx}px;top:${sy}px;width:${3 + (i % 3)}px;height:${3 + (i % 3)}px;` +
          `background:${(isCrit || isLast) ? '#fff2c8' : '#ffbe5c'};box-shadow:0 0 6px #ff7a2a;` +
          `--dx:${(Math.cos(ang) * d).toFixed(1)}px;--dy:${(Math.sin(ang) * d - 10).toFixed(1)}px;` +
          `pointer-events:none;z-index:9001;` +
          `animation:fx_spark ${(0.32 + (i % 3) * 0.06).toFixed(2)}s steps(5) both;`;
        document.body.appendChild(p);
        p.addEventListener('animationend', () => p.remove(), { once: true });
      }

      // Clash circle
      const clash = document.createElement('div');
      clash.style.cssText =
        `position:fixed;left:${sx - 20}px;top:${sy - 20}px;width:40px;height:40px;border-radius:50%;` +
        `background:radial-gradient(circle,rgba(255,230,150,.9),transparent 65%);` +
        `pointer-events:none;z-index:9001;animation:fx_clash .3s steps(4) both;`;
      document.body.appendChild(clash);
      clash.addEventListener('animationend', () => clash.remove(), { once: true });

      // Montage streak
      if (hitIdx >= 3 && !isLast) {
        const streak = document.createElement('div');
        streak.style.cssText =
          `position:fixed;` +
          `${side === 'me' ? 'left:8%' : 'left:52%'};` +
          `top:${(30 + (hitIdx % 5) * 8)}%;width:40%;height:3px;` +
          `background:linear-gradient(90deg,transparent,#ffbe5c,transparent);` +
          `transform-origin:${side === 'me' ? 'left' : 'right'};` +
          `pointer-events:none;z-index:9001;animation:fx_streak .22s steps(3) both;`;
        document.body.appendChild(streak);
        streak.addEventListener('animationend', () => streak.remove(), { once: true });
      }

      if (isLast) {
        _overlay(
          `radial-gradient(circle at ${sx}px ${sy}px,rgba(255,200,110,.85),transparent 55%)`,
          'fx_flash .5s steps(6) both',
          9002
        );
      }
    }

    // HIT 카운터 오버레이
    let hitOverlay = null, hitNumEl = null, phaseEl = null;
    function initHitOverlay(total) {
      hitOverlay = document.createElement('div');
      hitOverlay.style.cssText =
        `position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);` +
        `z-index:9002;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;`;
      phaseEl = document.createElement('div');
      phaseEl.style.cssText =
        `font-family:'Galmuri7',monospace;font-size:10px;color:#ff8a3c;letter-spacing:2px;text-shadow:1px 1px 0 #000;`;
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:baseline;gap:5px;`;
      const hitLabel = document.createElement('span');
      hitLabel.style.cssText = `font-family:'Galmuri7',monospace;font-size:11px;color:#8a8a98;`;
      hitLabel.textContent = 'HIT';
      hitNumEl = document.createElement('span');
      hitNumEl.style.cssText =
        `font-family:'Galmuri11',sans-serif;font-size:34px;color:#ffd76a;` +
        `text-shadow:0 0 8px rgba(245,170,60,.5),2px 2px 0 #000;`;
      hitNumEl.textContent = '0';
      const totEl = document.createElement('span');
      totEl.style.cssText = `font-family:'Galmuri7',monospace;font-size:11px;color:#5c5c6a;`;
      totEl.textContent = '/ ' + total;
      row.append(hitLabel, hitNumEl, totEl);
      hitOverlay.append(phaseEl, row);
      document.body.appendChild(hitOverlay);
    }
    function updateHit(n, phase) {
      if (!hitNumEl) return;
      hitNumEl.textContent = n;
      hitNumEl.style.animation = 'none'; void hitNumEl.offsetWidth;
      hitNumEl.style.animation = 'fx_hitPop .15s steps(2)';
      const labels = { open: '전투 개시', montage: '교 전', finish: '전투 종료' };
      if (phaseEl) phaseEl.textContent = labels[phase] || '';
    }

    // ── 메인 교전 루프 ────────────────────────────────────────────────────
    if (hits.length === 0) {
      if (damageTaken > 0) {
        if (updateHpFn) updateHpFn(myHp, oppHp);
        if (flashDamageFn) flashDamageFn(`-${Math.round(damageTaken)} HP`);
      }
      return;
    }

    setDurBar(myDurBar, myInitDur, myInitDur);
    setDurBar(oppDurBar, oppInitDur, oppInitDur);
    initHitOverlay(hits.length);

    await _wait(250);

    let interval = 400;
    let prevMy = myInitDur, prevOpp = oppInitDur;

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const isLast = i === hits.length - 1;
      const phase = i < 3 ? 'open' : isLast ? 'finish' : 'montage';
      const def = (hit.myDurAfter < prevMy) ? 'me' : 'opp';
      const crit = Math.random() < (isLast ? 1 : phase !== 'montage' ? 0.4 : 0.12);

      if (isLast) await _wait(300);

      updateHit(i + 1, phase);
      jolt(def === 'me' ? mySword : oppSword, def);
      spawnSparks(def, crit, isLast, i);
      setDurBar(myDurBar,  hit.myDurAfter, myInitDur);
      setDurBar(oppDurBar, hit.oppDurAfter, oppInitDur);

      prevMy  = hit.myDurAfter;
      prevOpp = hit.oppDurAfter;

      if (i >= 9) interval = Math.max(80, Math.round(interval * 0.9));
      if (!isLast) await _wait(interval);
    }

    const last = hits[hits.length - 1];
    await _wait(150);

    if (last.myDurAfter <= 0  && mySword)  { mySword.classList.add('sword-break-gray'); }
    if (last.oppDurAfter <= 0 && oppSword) { oppSword.classList.add('sword-break-gray'); }

    await _wait(550);

    if (hitOverlay) { hitOverlay.remove(); hitOverlay = null; }

    // WIN / LOSE 배너
    const myLost  = last.myDurAfter  <= 0 && last.oppDurAfter > 0;
    const oppLost = last.oppDurAfter <= 0 && last.myDurAfter  > 0;
    if (myLost || oppLost) {
      const cx = window.innerWidth / 2, cy = window.innerHeight * 0.4;
      const banner = document.createElement('div');
      banner.textContent = myLost ? 'LOSE' : 'WIN!';
      banner.style.cssText =
        `position:fixed;left:${cx}px;top:${cy}px;z-index:9003;pointer-events:none;` +
        `font-family:'Galmuri11',sans-serif;font-size:44px;letter-spacing:3px;` +
        `color:${myLost ? '#cfd2db' : '#ffd76a'};` +
        `text-shadow:${myLost ? '3px 3px 0 #000' : '0 0 16px rgba(245,170,60,.7),3px 3px 0 #000'};` +
        `animation:fx_resultIn .6s steps(7) both;`;
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 1400);
    }

    if (updateHpFn) updateHpFn(myHp, oppHp);
    if (damageTaken > 0 && flashDamageFn) flashDamageFn(`-${Math.round(damageTaken)} HP`);

    setTimeout(() => {
      if (mySword)  mySword.classList.remove('sword-break-gray');
      if (oppSword) oppSword.classList.remove('sword-break-gray');
    }, 1200);
  }

  // ── FX08: 7성 리빌 ──────────────────────────────────────────────────────
  function sevenStarReveal() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.46;

    // 어두워짐
    const dim = document.createElement('div');
    dim.style.cssText =
      `position:fixed;inset:0;background:#000;z-index:9000;pointer-events:none;` +
      `animation:fx_dim .3s steps(4) 1.0s both;`;
    document.body.appendChild(dim);
    setTimeout(() => {
      dim.style.animation = 'fx_dimOut .8s steps(6) both';
      dim.addEventListener('animationend', () => dim.remove(), { once: true });
    }, 1700);

    // 레인보우 광선
    const raysOuter = document.createElement('div');
    raysOuter.style.cssText =
      `position:fixed;left:${cx - 300}px;top:${cy - 300}px;width:600px;height:600px;` +
      `z-index:9001;pointer-events:none;border-radius:50%;overflow:hidden;` +
      `animation:fx_raysGrow 1.2s steps(8) 1.5s both;`;
    const raysInner = document.createElement('div');
    raysInner.style.cssText =
      `position:absolute;inset:0;border-radius:50%;` +
      `background:repeating-conic-gradient(from 0deg,rgba(255,210,90,.5) 0deg 8deg,transparent 8deg 24deg);` +
      `animation:fx_raysSpin 4s linear 1.5s infinite;`;
    raysOuter.appendChild(raysInner);
    document.body.appendChild(raysOuter);
    setTimeout(() => raysOuter.remove(), 5000);

    // 리빌 플래시
    setTimeout(() => {
      _overlay(
        `radial-gradient(circle at ${cx}px ${cy}px,rgba(255,240,200,.95),rgba(170,120,255,.3) 45%,transparent 70%)`,
        'fx_flash .6s steps(7) both',
        9003
      );
    }, 1600);

    // 레인보우 불꽃 파티클
    const cols = ['#ff5e5e', '#ffbe4d', '#7dff8a', '#4dd2ff', '#a97bff', '#ff5ec8'];
    for (let i = 0; i < 30; i++) {
      const ang = -Math.PI / 2 + (Math.random() * 2 - 1) * 1.3;
      const d = 100 + Math.random() * 180;
      const sz = 4 + (i % 3);
      const delay = 1.65 + Math.random() * 0.25;
      const p = document.createElement('div');
      p.style.cssText =
        `position:fixed;left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;` +
        `background:${cols[i % cols.length]};box-shadow:0 0 7px ${cols[i % cols.length]};` +
        `--dx:${(Math.cos(ang) * d).toFixed(1)}px;--dy:${(Math.sin(ang) * d).toFixed(1)}px;` +
        `pointer-events:none;z-index:9004;` +
        `animation:fx_emberBurst ${(0.9 + Math.random() * 0.6).toFixed(2)}s steps(8) ${delay.toFixed(2)}s both;`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }
  }

  // ── FX09: 카드 레벨업 ───────────────────────────────────────────────────
  function cardLevelUp(anchorEl) {
    const r = anchorEl ? anchorEl.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const ring = document.createElement('div');
    ring.style.cssText =
      `position:fixed;left:${cx - 60}px;top:${cy - 60}px;width:120px;height:120px;` +
      `border:3px solid #ffd76a;box-shadow:0 0 14px #ffce5a;` +
      `pointer-events:none;z-index:9001;animation:fx_ringPop .55s steps(6) both;`;
    document.body.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove(), { once: true });

    for (let i = 0; i < 16; i++) {
      const ang = (Math.PI * 2 * i) / 16;
      const d = 60 + (i % 3) * 22;
      const p = document.createElement('div');
      p.style.cssText =
        `position:fixed;left:${cx}px;top:${cy}px;width:4px;height:4px;` +
        `background:${i % 2 ? '#ffd76a' : '#fff2c8'};box-shadow:0 0 6px #ffce5a;` +
        `--dx:${(Math.cos(ang) * d).toFixed(1)}px;--dy:${(Math.sin(ang) * d).toFixed(1)}px;` +
        `pointer-events:none;z-index:9001;animation:fx_lvEmber .7s steps(7) both;`;
      document.body.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }

    const lv = document.createElement('div');
    lv.textContent = 'LEVEL UP!';
    lv.style.cssText =
      `position:fixed;left:${cx}px;top:${cy - 30}px;z-index:9003;pointer-events:none;` +
      `font-family:'Galmuri11',sans-serif;font-size:26px;color:#ffd76a;` +
      `text-shadow:0 0 12px rgba(245,170,60,.7),2px 2px 0 #000;white-space:nowrap;` +
      `animation:fx_lvBurst 1.1s steps(9) both;`;
    document.body.appendChild(lv);
    lv.addEventListener('animationend', () => lv.remove(), { once: true });

    const xpft = document.createElement('div');
    xpft.textContent = '+XP';
    xpft.style.cssText =
      `position:fixed;left:${cx}px;top:${cy - 10}px;z-index:9003;pointer-events:none;` +
      `font-family:'Galmuri11',sans-serif;font-size:18px;color:#8be89c;` +
      `text-shadow:0 0 8px rgba(80,220,120,.5),1px 1px 0 #000;white-space:nowrap;` +
      `animation:fx_floatXp 1s steps(6) .42s both;`;
    document.body.appendChild(xpft);
    xpft.addEventListener('animationend', () => xpft.remove(), { once: true });
  }

  // ── FX11: HP 경고 (지속형 비네트) ──────────────────────────────────────
  function hpWarning(active, hp) {
    const el = document.getElementById('hp-warning-vignette');
    if (!el) return;
    if (!active || hp <= 0) {
      el.classList.remove('active');
      el.style.animation = '';
    } else {
      el.classList.add('active');
      const dur = (0.45 + (hp / 30) * 0.85).toFixed(2) + 's';
      el.style.animation = `fx_vignette ${dur} steps(8) infinite`;
    }
  }

  // ── FX15: 강화 쿨타임 (버튼 내부 bottom-up fill) ──────────────────────
  // progress: 0~100 으로 외부에서 주입
  function setCooldownOverlay(progress) {
    const btn = document.getElementById('btn-enhance');
    if (!btn) return;

    let ov = btn.querySelector('.enhance-cd-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.className = 'enhance-cd-overlay';
      btn.appendChild(ov);
    }

    const disp = Math.max(0, Math.min(100, Math.round(progress / 4) * 4));

    if (disp <= 0) {
      ov.style.height = '0%';
      return;
    }
    if (disp >= 100) {
      ov.style.height = '0%';
      btn.classList.remove('fx-ready');
      void btn.offsetWidth;
      btn.classList.add('fx-ready');
      btn.addEventListener('animationend', () => btn.classList.remove('fx-ready'), { once: true });
      // 준비 완료 스파크
      for (let i = 0; i < 4; i++) {
        const r = btn.getBoundingClientRect();
        const sp = document.createElement('div');
        sp.style.cssText =
          `position:fixed;left:${r.left + (r.width * (0.15 + i * 0.24))}px;top:${r.bottom + 2}px;` +
          `width:4px;height:4px;background:#ffce5a;box-shadow:0 0 6px #ff9a3c;` +
          `pointer-events:none;z-index:9001;animation:fx_sparkUp .35s steps(4) both;`;
        document.body.appendChild(sp);
        sp.addEventListener('animationend', () => sp.remove(), { once: true });
      }
      return;
    }

    ov.style.height = disp + '%';
  }

  return {
    success, fail, coinChange, sell, roundStart, shopOpen,
    combat, sevenStarReveal, cardLevelUp, hpWarning, setCooldownOverlay,
  };
})();
